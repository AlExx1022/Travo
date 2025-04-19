/**
 * 基礎 API 服務類
 * 處理與後端 API 的所有交互
 */
class ApiService {
  private baseUrl: string;
  
  constructor() {
    // 從環境變量中獲取 API 基礎 URL，如果沒有設置，則使用默認值
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
    console.log('API 服務初始化，基礎 URL:', this.baseUrl);
  }
  
  /**
   * 構建完整的 API URL
   */
  private buildUrl(endpoint: string): string {
    return `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  }
  
  /**
   * 獲取授權頭
   */
  private getAuthHeader(): Headers {
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    
    const token = localStorage.getItem('travo_auth_token');
    if (token) {
      headers.append('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  }
  
  /**
   * 處理 API 回應
   */
  private async handleResponse(response: Response): Promise<any> {
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API 錯誤:', errorText);
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || errorJson.error || `請求失敗: ${response.status}`);
      } catch (e) {
        throw new Error(`請求失敗 (${response.status}): ${errorText.substring(0, 100)}`);
      }
    }
    
    try {
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        
        // 監控回應中的圖片數據
        if (data) {
          if (Array.isArray(data)) {
            console.log(`API 返回了 ${data.length} 筆數據陣列`);
            // 檢查第一筆資料的結構
            if (data.length > 0) {
              console.log('數據包含的主要屬性:', Object.keys(data[0]).join(', '));
              // 特別檢查照片相關欄位
              const photoFields = ['photos', 'activities', 'days', 'cover_image'].filter(field => field in data[0]);
              if (photoFields.length > 0) {
                console.log('數據中包含的照片相關欄位:', photoFields.join(', '));
              }
            }
          } else if (typeof data === 'object') {
            console.log('API 返回了物件結構的數據，主要屬性:', Object.keys(data).join(', '));
            // 檢查是否包含計劃陣列
            if (data.plans && Array.isArray(data.plans)) {
              console.log(`數據中包含 ${data.plans.length} 筆計劃數據`);
              if (data.plans.length > 0) {
                console.log('計劃數據包含的主要屬性:', Object.keys(data.plans[0]).join(', '));
              }
            }
          }
        }
        
        return data;
      } else {
        return await response.text();
      }
    } catch (error) {
      console.error('處理 API 回應時出錯:', error);
      throw new Error(`處理回應時出錯: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * 發送 GET 請求
   */
  async get(endpoint: string, config: RequestInit = {}): Promise<any> {
    const url = this.buildUrl(endpoint);
    console.log(`發送 GET 請求到: ${url}`);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeader(),
        ...config,
        mode: 'cors',
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error(`GET 請求失敗 (${endpoint}):`, error);
      throw error;
    }
  }
  
  // ... existing code ...
}

// ... existing code ... 