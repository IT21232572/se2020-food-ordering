import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://se2020-food-ordering-backend.onrender.com/api', 
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;