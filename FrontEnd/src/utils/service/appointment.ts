import { requestAPI } from "../api/request";
import { Appointment } from "../../types/appointment";
import { getApiUrl } from '../../config/env';

const BASE_URL = getApiUrl('/appointments');

interface BookPayload {
  doctor_id: string;
  appointment_time: string;
  patient_notes: string;
}

export async function fetchAppointments(): Promise<Appointment[]> {
  const { data, error, status } = await requestAPI(BASE_URL, "/patient", "GET", undefined);
  if (error || status >= 400) {
    throw new Error(data?.message || error || "Lỗi khi tải lịch hẹn");
  }
  return data.appointments as Appointment[];
}

export async function fetchDoctorAppointments(): Promise<Appointment[]> {
  const { data, error, status } = await requestAPI(BASE_URL, `/doctor`, "GET", undefined);
  if (error || status >= 400) {
    throw new Error(data?.message || error || "Lỗi khi tải lịch hẹn");
  }
  return data.appointments as Appointment[];
}

export async function bookAppointment(payload: BookPayload): Promise<Appointment> {
  const { data, error, status } = await requestAPI(BASE_URL, "", "POST", payload);
  if (error || status >= 400) {
    throw new Error(data?.message || error || "Lỗi khi đặt lịch hẹn");
  }
  return data.appointment as Appointment;
}

export async function updateAppointmentStatus(appointment_id: string, status: string, doctor_notes: string): Promise<Appointment> {
  const { data, error, status: responseStatus } = 
        await requestAPI(BASE_URL, `/update`, "PUT", { appointment_id, status , doctor_notes });
  if (error || responseStatus >= 400) {
    throw new Error(data?.message || error || "Lỗi khi cập nhật trạng thái");
  }
  return data.appointment as Appointment;
}
