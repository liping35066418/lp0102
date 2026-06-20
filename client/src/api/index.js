import axios from 'axios'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

request.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    return Promise.reject(error)
  }
)

export const api = {
  getVenues: () => request.get('/venues'),
  getEquipments: (category) => request.get('/equipments', { params: { category } }),
  getEquipmentCategories: () => request.get('/equipments/categories'),
  checkBookings: (venueId, date) => request.get('/bookings/check', { params: { venue_id: venueId, date } }),
  calculateFee: (data) => request.post('/calculate', data),
  createBooking: (data) => request.post('/bookings', data),
  getBookings: (params) => request.get('/bookings', { params }),
  getBookingDetail: (id) => request.get(`/bookings/${id}`),
  cancelBooking: (id) => request.put(`/bookings/${id}/cancel`),
  completeBooking: (id) => request.put(`/bookings/${id}/complete`),
  getBookingStats: (params) => request.get('/bookings/statistics', { params }),
  getDiscounts: () => request.get('/discounts'),
  createDiscount: (data) => request.post('/discounts', data),
  updateDiscount: (id, data) => request.put(`/discounts/${id}`, data),
  deleteDiscount: (id) => request.delete(`/discounts/${id}`),
}

export default request
