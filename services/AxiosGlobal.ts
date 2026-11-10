import axios from "axios";

const axiosGlobal = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

export default axiosGlobal;
