import axios from "axios";

export type SensorPayload = {
  temperature: number;
  pressure: number;
  humidity: number;
  timestamp: string;
};

export const sensorApi = axios.create({
  baseURL: "http://localhost:8000/api",
  timeout: 5000,
});

export async function fetchSensorData() {
  const { data } = await sensorApi.get<SensorPayload>("/sensor");
  return data;
}
