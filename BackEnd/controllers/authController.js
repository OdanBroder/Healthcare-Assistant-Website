import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../config/db.js"; 
import dotenv from "dotenv";
import { isUsernameValid, isEmailValid } from "../utils/format/account.js";
import { PasswordCheckStrength, statePassword } from "../utils/format/passwd.js";

dotenv.config();

export const register = async (req, res) => {
    const { username, email, password } = req.body;

    if (!isUsernameValid(username)) {
        console.log("❌ Invalid username");
        return res.status(400).json({
            success: false,
            error: "Invalid username"
        });
    }

    if (!isEmailValid(email)) {
        console.log("❌ Invalid email");
        return res.status(400).json({
            success: false,
            error: "Invalid email"
        });
    }

    const passwordCheck = statePassword(password);
    switch (passwordCheck) {
        case PasswordCheckStrength.Short:
            console.log("❌ Password is too short");
            return res.status(400).json({
                success: false,
                error: "Password is too short"
            });
        case PasswordCheckStrength.Common:
            console.log("❌ Password is too common");
            return res.status(400).json({
                success: false,
                error: "Password is too common"
            });
        case PasswordCheckStrength.Weak:
            console.log("❌ Password is too weak");
            return res.status(400).json({
                success: false,
                error: "Password is too weak"
            });
        case PasswordCheckStrength.Ok:
            console.log("✅ Password is ok");
            break;
        case PasswordCheckStrength.Strong:
            console.log("✅ Password is strong");
            break;
        default:
            console.log("❌ Invalid handle password");
            return res.status(400).json({
                success: false,
                error: "Invalid handle password"
            });
    }


    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const checkSql = 'SELECT username FROM users WHERE username = ? OR email = ?';
        const [existingUsers] = await connection.execute(checkSql, [username, email]);

        if (existingUsers.length > 0) {
            const existingUser = existingUsers[0];
            await connection.rollback();
            connection.release();

            if (existingUser.username === username) {
                return res.status(400).json({
                    success: false,
                    error: "Username already exists"
                });
            } else {
                return res.status(400).json({
                    success: false,
                    error: "Email already exists"
                });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `INSERT INTO users (username, email, password_hash) 
                     VALUES (?, ?, ?)`;

        const [result] = await connection.execute(sql, [
            username, email, hashedPassword
        ]);

        await connection.commit();
        console.log("✅ User registered:", result.insertId);

        connection.release();
        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            userId: result.insertId
        });
    } catch (err) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }

        console.error("❌ Registration error:", err);
        return res.status(500).json({ success: false, error: "Internal server error" });
    }
};

export const login = async (req, res) => {
    console.log("Received login request:", req.body);

    const { email, username, password } = req.body;
    const loginField = email || username;

    if (!loginField || !password) {
        console.log("❌ Missing login credentials");
        return res.status(400).json({ success: false, error: "Missing login credentials" });
    }

    if(email && !isEmailValid(email)) {
        return res.status(400).json({
            success: false,
            error: "Invalid email"
        });
    }

    if(username && !isUsernameValid(username)) {

        return res.status(400).json({
            success: false,
            error: "Invalid username"
        });
    }

    const sql = `SELECT * FROM users WHERE ${email ? "email" : "username"} = ?`;

    try {
        const [results] = await db.execute(sql, [loginField]);
        console.log("🔍 Searching for user:", loginField);
        if (results.length === 0) {
            console.log("🔍 User not found");
            return res.status(400).json({ success: false, error: "User not found" });
        }

        const user = results[0];
        console.log("✅ User found:", user);

        if (!await bcrypt.compare(password, user.password_hash)) {
            console.log("❌ Invalid credentials: Incorrect password");
            return res.status(400).json({ success: false, error: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user.user_id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        console.log("✅ Login successful! Token generated.");

        return res.status(200).json({
            success: true,
            token,
            user: { id: user.user_id, username: user.username, email: user.email, role: user.role },
        });

    } catch (err) {
        console.error("❌ Database error:", err);
        return res.status(500).json({ success: false, error: "Internal server error" });
    }
};
