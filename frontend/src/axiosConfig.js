import axios from 'axios';

// 1. Thiết lập đường dẫn gốc (Base URL)
// Sau này gọi API chỉ cần axios.get('/api/rooms/') thay vì gõ full link
axios.defaults.baseURL = 'http://127.0.0.1:8000';

// 2. Thiết lập Interceptor (Bộ đón lõng Request)
axios.interceptors.request.use(
  (config) => {
    // Lấy token từ bộ nhớ
    const token = localStorage.getItem('access_token');
    
    // Nếu có token, gắn vào Header
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3. Thiết lập Interceptor (Bộ đón lõng Response) - Xử lý khi Token hết hạn
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Nếu lỗi 401 (Hết hạn hoặc không có quyền)
    if (error.response && error.response.status === 401) {
      // Xóa token cũ
      localStorage.removeItem('access_token');
      // Chuyển hướng về trang login (hoặc reload để App.jsx xử lý)
      window.location.href = '/'; 
    }
    return Promise.reject(error);
  }
);

export default axios;