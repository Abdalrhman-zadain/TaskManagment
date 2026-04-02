import axios from 'axios'

// All API calls go through this instance
const api = axios.create({
  baseURL: '/api'
})

// Automatically attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// If token expired, redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Get backend base URL that works on any device
export function getBackendUrl() {
  return `http://${window.location.hostname}:5000`
}

export default api
