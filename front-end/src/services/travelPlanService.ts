// API URL設置 - 從環境變數中獲取
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true'; // 環境變數控制是否使用模擬數據
const API_TIMEOUT = 10000; // 設置API請求超時時間為10秒

// 定義 TravelPlan 接口
interface TravelPlan {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  description?: string;
  is_public: boolean;
  cover_image?: string;
  activities: any[];  // 修改為必須存在的數組
  user_id: string;
  username?: string;
  created_at?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
}

// 啟動時輸出 API 配置信息
console.log('API 設置信息:', {
  API_BASE_URL,
  USE_MOCK_DATA,
  'VITE_API_URL': import.meta.env.VITE_API_URL,
  'NODE_ENV': import.meta.env.NODE_ENV
});

// 檢查API連接配置並輸出信息
console.log('檢查API連接配置:');
console.log('當前設定的API地址:', API_BASE_URL);
console.log('使用的環境變數:', import.meta.env.VITE_API_URL || '未設置，使用相對路徑 /api');
console.log('當前頁面URL:', window.location.href);
console.log('預期的API完整地址:', `${API_BASE_URL}/travel-plans`);

/**
 * 旅行計劃服務 - 處理與旅行計劃相關的所有API請求
 */
class TravelPlanService {
  /**
   * 創建一個帶有超時的fetch請求
   * @param url API地址
   * @param options fetch選項
   * @param timeout 超時時間（毫秒）
   */
  async fetchWithTimeout(url: string, options: RequestInit, timeout = API_TIMEOUT) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(id);
      return response;
    } catch (error: any) {
      clearTimeout(id);
      
      if (error.name === 'AbortError') {
        throw new Error('請求超時，請檢查網絡連接或後端服務是否可用');
      }
      
      throw error;
    }
  }
  
  /**
   * 帶有重試機制的API請求函數
   * @param url API地址
   * @param options fetch選項
   * @param retries 重試次數
   */
  async fetchWithRetry(url: string, options: RequestInit, retries = 2) {
    let lastError: Error | null = null;
    
    for (let i = 0; i <= retries; i++) {
      try {
        return await this.fetchWithTimeout(url, options);
      } catch (error: any) {
        console.warn(`API請求失敗，重試中 (${i+1}/${retries+1})...`);
        lastError = error;
        
        // 等待一小段時間再重試
        if (i < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * 獲取用戶所有旅行計劃
   * @param options 可選參數對象，可以包含 includeActivities 等選項
   * @returns 包含用戶所有旅行計劃的回應
   */
  async getUserTravelPlans(options: { includeActivities?: boolean } = {}) {
    try {
      console.log('開始獲取用戶旅行計劃數據', options);
      console.log('API 基礎 URL:', API_BASE_URL);
      
      const token = localStorage.getItem('travo_auth_token');
      if (!token) {
        console.warn('未找到認證令牌，無法獲取旅行計劃');
        throw new Error('未找到認證令牌，請重新登入');
      }
      
      console.log('已獲取認證令牌 (長度):', token.length);
      
      // 構建 URL 並添加參數
      let url = `${API_BASE_URL}/travel-plans`;
      
      // 如果需要包含活動數據，添加對應的參數
      if (options.includeActivities) {
        url += '?include_activities=true';
        console.log('請求包含完整活動數據');
      }
      
      console.log('正在發送API請求獲取用戶旅行計劃，完整 URL:', url);
      
      try {
        // 嘗試使用直接的 fetch 而不是 fetchWithRetry，以便獲取更詳細的錯誤信息
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          // 添加 mode 和 credentials 以處理 CORS
          mode: 'cors',
          credentials: 'same-origin'
        });
        
        console.log('API回應狀態:', response.status, response.statusText);
        console.log('API回應頭:', Object.fromEntries([...response.headers.entries()]));
        
        const data = await response.json();
        
        if (!response.ok) {
          console.error('API請求不成功:', response.status, response.statusText);
          console.error('API錯誤詳情:', data);
          throw new Error(data.message || `請求失敗 (${response.status}): ${response.statusText}`);
        }
        
        console.log('API請求成功，返回數據類型:', typeof data, Array.isArray(data) ? '是陣列' : '不是陣列');
        console.log('API請求成功，返回數據結構:', JSON.stringify(data).substring(0, 200) + '...');
        
        // 處理 MongoDB ID 不一致問題
        if (Array.isArray(data)) {
          console.log('API 響應是陣列，對每個對象進行詳細檢查:');
          // 如果是陣列，處理每個旅行計劃
          const processedData = data.map((plan: any, index: number) => {
            // 檢查每個計劃對象的所有頂層屬性
            console.log(`計劃 ${index} 的所有屬性:`, Object.keys(plan));
            console.log(`計劃 ${index} 的 ID 相關屬性:`, {
              id: plan.id,
              _id: plan._id,
              planId: plan.planId,
              plan_id: plan.plan_id
            });
            
            // 檢查是否已有 id，如果沒有則嘗試從其他 ID 欄位複製
            if (!plan.id) {
              if (plan._id) {
                console.log(`旅行計劃缺少 id 欄位，從 _id 自動添加: ${plan._id}`);
                plan.id = plan._id;
              } else if (plan.planId) {
                console.log(`旅行計劃缺少 id 欄位，從 planId 自動添加: ${plan.planId}`);
                plan.id = plan.planId;
              } else if (plan.plan_id) {
                console.log(`旅行計劃缺少 id 欄位，從 plan_id 自動添加: ${plan.plan_id}`);
                plan.id = plan.plan_id;
              } else {
                // 生成臨時 ID 並記錄
                const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                console.log(`旅行計劃沒有任何 ID 欄位，生成臨時 ID: ${tempId}`);
                plan.id = tempId;
              }
            }
            
            // 記錄處理後的 ID
            console.log(`計劃 ${index} 最終使用的 ID: ${plan.id}`);
            return plan;
          });
          return processedData;
        } else if (data && typeof data === 'object' && data.plans && Array.isArray(data.plans)) {
          // 如果是包裹在 plans 欄位中的數組
          console.log('API 響應是對象，包含 plans 陣列，檢查對象所有屬性:', Object.keys(data));
          const processedPlans = data.plans.map((plan: any, index: number) => {
            // 檢查每個計劃對象的所有頂層屬性
            console.log(`plans[${index}] 的所有屬性:`, Object.keys(plan));
            console.log(`plans[${index}] 的 ID 相關屬性:`, {
              id: plan.id,
              _id: plan._id,
              planId: plan.planId,
              plan_id: plan.plan_id
            });
            
            if (!plan.id) {
              if (plan._id) {
                console.log(`旅行計劃缺少 id 欄位，從 _id 自動添加: ${plan._id}`);
                plan.id = plan._id;
              } else if (plan.planId) {
                console.log(`旅行計劃缺少 id 欄位，從 planId 自動添加: ${plan.planId}`);
                plan.id = plan.planId;
              } else if (plan.plan_id) {
                console.log(`旅行計劃缺少 id 欄位，從 plan_id 自動添加: ${plan.plan_id}`);
                plan.id = plan.plan_id;
              } else {
                // 生成臨時 ID 並記錄
                const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                console.log(`旅行計劃沒有任何 ID 欄位，生成臨時 ID: ${tempId}`);
                plan.id = tempId;
              }
            }
            
            console.log(`plans[${index}] 最終使用的 ID: ${plan.id}`);
            return plan;
          });
          data.plans = processedPlans;
          return data;
        }
        
        return data;
      } catch (networkError: any) {
        console.error('網絡請求過程中出錯:', networkError);
        console.error('錯誤類型:', networkError.name);
        console.error('錯誤訊息:', networkError.message);
        
        // 如果是 CORS 問題，提供更詳細的診斷
        if (networkError.message.includes('CORS') || networkError.message.includes('cross-origin')) {
          console.error('CORS 問題診斷: 後端可能需要配置 Access-Control-Allow-Origin 頭部');
          console.error('嘗試的 URL:', `${API_BASE_URL}/travel-plans`);
          console.error('當前域名:', window.location.origin);
        }
        
        throw networkError;
      }
    } catch (error: any) {
      console.error('獲取旅行計劃列表時出錯:', error);
      console.error('是否為網絡錯誤:', error instanceof TypeError && error.message.includes('fetch'));
      
      // 遇到 CORS 問題的特殊處理
      if (error.message.includes('CORS') || error.message.includes('跨域')) {
        console.error('可能遇到 CORS 跨域問題，請檢查 API 服務器是否允許跨域請求');
      }
      
      throw error;
    }
  }

  /**
   * 獲取特定旅行計劃詳情
   * @param planId 旅行計劃ID
   * @returns 包含旅行計劃詳情的回應
   */
  async getTravelPlanById(planId: string): Promise<TravelPlan> {
    console.log(`TravelPlanService: 嘗試獲取計畫 ID ${planId}`);
    
    // 嘗試多個可能的 API 端點 - 使用絕對路徑
    const possibleEndpoints = [
      `/travel-plans/${planId}`,
      `/travel-plans/public/${planId}`,
      `/plans/public/${planId}`
    ];
    
    let lastError: Error | null = null;
    let hasUnauthorizedError = false;
    
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`TravelPlanService: 嘗試訪問端點 ${endpoint}`);
        
        const token = localStorage.getItem('travo_auth_token');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        // 如果有令牌，添加到請求頭
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        // 直接使用 fetch 而不是 fetchWithRetry，更容易調試
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'GET',
          headers,
        });
        
        console.log(`TravelPlanService: 端點 ${endpoint} 響應狀態 ${response.status}`);
        
        if (response.ok) {
          // 嘗試作為 text 先獲取響應，方便調試
          const textResponse = await response.text();
          console.log(`TravelPlanService: 響應內容的前 100 個字符:`, textResponse.substring(0, 100));
          
          try {
            // 解析為 JSON
            const data = JSON.parse(textResponse);
            
            // 驗證數據格式
            if (!data || typeof data !== 'object') {
              throw new Error(`從端點 ${endpoint} 獲取的數據格式無效`);
            }
            
            console.log(`TravelPlanService: 成功從端點 ${endpoint} 獲取計畫數據`);
            
            return data as TravelPlan;
          } catch (parseError) {
            console.error(`TravelPlanService: 無法解析 JSON 響應:`, parseError);
            throw new Error(`從端點 ${endpoint} 獲取的數據不是有效的 JSON`);
          }
        }
        
        if (response.status === 401) {
          console.log(`TravelPlanService: 端點 ${endpoint} 返回未授權錯誤`);
          hasUnauthorizedError = true;
          throw new Error('需要登入才能查看此旅行計畫');
        } else if (response.status === 404) {
          throw new Error(`在端點 ${endpoint} 找不到計畫 ${planId}`);
        } else {
          throw new Error(`端點 ${endpoint} 響應錯誤: ${response.status} ${response.statusText}`);
        }
      } catch (error: any) {
        console.error(`TravelPlanService: 從端點 ${endpoint} 獲取計畫失敗:`, error);
        lastError = error;
        
        // 如果非 401 錯誤，繼續嘗試下一個端點
        if (error.message && error.message.includes('401')) {
          hasUnauthorizedError = true;
        }
      }
    }
    
    // 如果所有端點都失敗
    if (hasUnauthorizedError) {
      throw new Error('此旅行計畫需要登入才能查看。請先登入後再嘗試訪問。');
    } else if (lastError) {
      throw lastError;
    } else {
      throw new Error(`無法獲取計畫 ${planId}，所有已知端點均失敗`);
    }
  }

  /**
   * 創建新的旅行計劃
   * @param planData 旅行計劃數據
   * @returns 包含新創建的旅行計劃ID的回應
   */
  async createTravelPlan(planData: any) {
    try {
      console.log('開始創建新的旅行計劃');
      
      const token = localStorage.getItem('travo_auth_token');
      if (!token) {
        console.warn('未找到認證令牌，無法創建旅行計劃');
        throw new Error('未找到認證令牌，請重新登入');
      }
      
      console.log('正在發送API請求創建旅行計劃，完整 URL:', `${API_BASE_URL}/travel-plans/generate`);
      console.log('發送的數據:', JSON.stringify(planData).substring(0, 200) + '...');

      try {
        const response = await fetch(`${API_BASE_URL}/travel-plans/generate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify(planData),
          mode: 'cors',
          credentials: 'same-origin'
        });
        
        console.log('API回應狀態:', response.status, response.statusText);
        
        const data = await response.json();
        
        if (!response.ok) {
          console.error('API請求不成功:', response.status, response.statusText);
          console.error('API錯誤詳情:', data);
          throw new Error(data.message || `請求失敗 (${response.status}): ${response.statusText}`);
        }
        
        console.log('成功創建旅行計劃，返回數據:', data);
        return data;
      } catch (networkError: any) {
        console.error('創建旅行計劃的網絡請求出錯:', networkError);
        console.error('錯誤類型:', networkError.name);
        console.error('錯誤訊息:', networkError.message);
        throw networkError;
      }
    } catch (error: any) {
      console.error('創建旅行計劃時出錯:', error);
      throw error;
    }
  }

  /**
   * 更新旅行計劃
   * @param planId 旅行計劃ID
   * @param planData 要更新的數據
   * @returns 包含更新結果的回應
   */
  async updateTravelPlan(planId: string, planData: any) {
    try {
      console.log(`開始更新旅行計劃 ${planId}`);
      
      const token = localStorage.getItem('travo_auth_token');
      if (!token) {
        throw new Error('未找到認證令牌，請重新登入');
      }
      
      const response = await this.fetchWithRetry(`${API_BASE_URL}/travel-plans/${planId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(planData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `更新旅行計劃失敗 (${response.status}): ${response.statusText}`);
      }
      
      console.log('旅行計劃更新成功', data);
      return data;
    } catch (error: any) {
      console.error('更新旅行計劃時出錯:', error);
      throw error;
    }
  }
  
  /**
   * 更新旅行計劃的隱私設置
   * @param planId 旅行計劃ID
   * @param isPublic 是否公開，true 表示公開，false 表示不公開
   * @returns 包含更新結果的回應
   */
  async updateTravelPlanPrivacy(planId: string, isPublic: boolean) {
    try {
      console.log(`開始更新旅行計劃 ${planId} 的隱私設置為: ${isPublic ? '公開' : '不公開'}`);
      
      // 使用現有的 updateTravelPlan 方法，只更新 is_public 字段
      const updateData = {
        is_public: isPublic
      };
      
      const result = await this.updateTravelPlan(planId, updateData);
      
      // 格式化回應
      return {
        success: true,
        message: `旅行計劃已設為${isPublic ? '公開' : '不公開'}`,
        data: result
      };
    } catch (error: any) {
      console.error('更新旅行計劃隱私設置時出錯:', error);
      return {
        success: false,
        message: error.message || '更新隱私設置失敗',
        error: error.toString()
      };
    }
  }

  /**
   * 刪除旅行計劃
   * @param planId 要刪除的旅行計劃ID
   * @returns 操作結果
   */
  async deleteTravelPlan(planId: string) {
    try {
      console.log(`開始刪除旅行計劃 ${planId}`);
      
      const token = localStorage.getItem('travo_auth_token');
      if (!token) {
        console.warn('未找到認證令牌，無法刪除旅行計劃');
        throw new Error('未找到認證令牌，請重新登入');
      }

      console.log(`正在發送API請求刪除旅行計劃 ${planId}，完整 URL:`, `${API_BASE_URL}/travel-plans/${planId}`);
      
      try {
        const response = await fetch(`${API_BASE_URL}/travel-plans/${planId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          mode: 'cors',
          credentials: 'same-origin'
        });
        
        console.log('API回應狀態:', response.status, response.statusText);
        
        const data = await response.json();
        
        if (!response.ok) {
          console.error('API請求不成功:', response.status, response.statusText);
          console.error('API錯誤詳情:', data);
          throw new Error(data.message || `請求失敗 (${response.status}): ${response.statusText}`);
        }
        
        console.log(`成功刪除旅行計劃 ${planId}`);
        return data;
      } catch (networkError: any) {
        console.error(`刪除旅行計劃 ${planId} 的網絡請求出錯:`, networkError);
        console.error('錯誤類型:', networkError.name);
        console.error('錯誤訊息:', networkError.message);
        throw networkError;
      }
    } catch (error: any) {
      console.error(`刪除旅行計劃 ${planId} 時出錯:`, error);
      throw error;
    }
  }

  /**
   * 添加單一活動到旅行計劃
   * @param planId 旅行計劃ID
   * @param dayIndex 要添加活動的天數索引 (從0開始)
   * @param activity 活動數據
   * @returns 包含新活動ID的回應
   */
  async addActivity(planId: string, dayIndex: number, activity: any) {
    try {
      console.log(`開始添加活動到旅行計劃 ${planId} 的第 ${dayIndex+1} 天`);
      
      const token = localStorage.getItem('travo_auth_token');
      if (!token) {
        console.warn('未找到認證令牌，無法添加活動');
        throw new Error('未找到認證令牌，請重新登入');
      }

      console.log(`正在發送API請求添加活動，完整 URL:`, `${API_BASE_URL}/travel-plans/${planId}/activities`);
      console.log('發送的數據:', { dayIndex, activity });
      
      try {
        const response = await fetch(`${API_BASE_URL}/travel-plans/${planId}/activities`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            day_index: dayIndex,
            activity: activity
          }),
          mode: 'cors',
          credentials: 'same-origin'
        });
        
        console.log('API回應狀態:', response.status, response.statusText);
        
        const data = await response.json();
        
        if (!response.ok) {
          console.error('API請求不成功:', response.status, response.statusText);
          console.error('API錯誤詳情:', data);
          throw new Error(data.message || `請求失敗 (${response.status}): ${response.statusText}`);
        }
        
        console.log(`成功添加活動到旅行計劃 ${planId} 的第 ${dayIndex+1} 天`);
        return data;
      } catch (networkError: any) {
        console.error(`添加活動的網絡請求出錯:`, networkError);
        console.error('錯誤類型:', networkError.name);
        console.error('錯誤訊息:', networkError.message);
        throw networkError;
      }
    } catch (error: any) {
      console.error(`添加活動時出錯:`, error);
      throw error;
    }
  }

  /**
   * 更新旅行計劃中的特定活動
   * @param planId 旅行計劃ID
   * @param activityId 要更新的活動ID
   * @param activity 更新後的活動數據
   * @param targetDayIndex 可選，移動活動到其他天的目標索引
   * @returns 操作結果
   */
  async updateActivity(planId: string, activityId: string, activity: any, targetDayIndex?: number) {
    try {
      console.log(`開始更新旅行計劃 ${planId} 中的活動 ${activityId}`);
      
      const token = localStorage.getItem('travo_auth_token');
      if (!token) {
        console.warn('未找到認證令牌，無法更新活動');
        throw new Error('未找到認證令牌，請重新登入');
      }

      const requestData: any = {
        activity: activity
      };
      
      // 如果指定了目標天數，添加到請求數據
      if (targetDayIndex !== undefined) {
        requestData.day_index = targetDayIndex;
        console.log(`將活動 ${activityId} 移動到第 ${targetDayIndex+1} 天`);
      }

      console.log(`正在發送API請求更新活動，完整 URL:`, `${API_BASE_URL}/travel-plans/${planId}/activities/${activityId}`);
      console.log('發送的數據:', requestData);
      
      try {
        const response = await fetch(`${API_BASE_URL}/travel-plans/${planId}/activities/${activityId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify(requestData),
          mode: 'cors',
          credentials: 'same-origin'
        });
        
        console.log('API回應狀態:', response.status, response.statusText);
        
        const data = await response.json();
        
        if (!response.ok) {
          console.error('API請求不成功:', response.status, response.statusText);
          console.error('API錯誤詳情:', data);
          throw new Error(data.message || `請求失敗 (${response.status}): ${response.statusText}`);
        }
        
        console.log(`成功更新活動 ${activityId}`);
        return data;
      } catch (networkError: any) {
        console.error(`更新活動的網絡請求出錯:`, networkError);
        console.error('錯誤類型:', networkError.name);
        console.error('錯誤訊息:', networkError.message);
        throw networkError;
      }
    } catch (error: any) {
      console.error(`更新活動時出錯:`, error);
      throw error;
    }
  }

  /**
   * 從旅行計劃中刪除特定活動
   * @param planId 旅行計劃ID
   * @param activityId 要刪除的活動ID或索引標識符（格式：idx-dayIndex-activityIndex）
   * @returns 操作結果，包含成功標誌、消息和其他元數據
   */
  async deleteActivity(planId: string, activityId: string): Promise<{
    success: boolean;
    message: string;
    error?: string;
    data?: any;
    db_verification?: boolean;
    localOnly?: boolean;
    serverError?: boolean;
    clientError?: boolean;
  }> {
    try {
      console.log(`[deleteActivity] 開始從旅行計劃 ${planId} 刪除活動 ${activityId}`);
      
      // 嘗試從URL或本地緩存中獲取計劃ID
      if (!planId || planId === 'undefined' || planId === 'null') {
        const url = window.location.pathname;
        const planIdMatch = url.match(/\/travel-plans\/([a-zA-Z0-9]+)/);
        const urlPlanId = planIdMatch ? planIdMatch[1] : null;
        console.log(`[deleteActivity] URL解析結果：${urlPlanId}`);
        
        // 檢查URL中是否有計劃ID
        if (urlPlanId && urlPlanId !== 'undefined' && urlPlanId !== 'null') {
          console.log(`[deleteActivity] 從URL成功獲取計劃ID: ${urlPlanId}`);
          planId = urlPlanId;
        } else {
          // 嘗試從本地存儲中恢復計劃ID
          const lastPlanId = localStorage.getItem('travo_last_plan_id');
          if (lastPlanId && lastPlanId !== 'undefined' && lastPlanId !== 'null') {
            console.log(`[deleteActivity] 從本地存儲恢復計劃ID: ${lastPlanId}`);
            planId = lastPlanId;
          }
        }
      }
      
      // 仍然沒有有效的計劃ID，只能進行本地刪除
      if (!planId || planId === 'undefined' || planId === 'null') {
        console.error('[deleteActivity] 刪除活動時提供了無效的計劃ID，無法與伺服器同步:', planId);
        
        // 嘗試只在本地執行刪除操作
        if (activityId && activityId !== 'undefined' && activityId !== 'null') {
          // 本地刪除邏輯 - 將活動ID添加到本地存儲的已刪除列表中
          try {
            this.saveLocalDeletion(activityId);
            return { 
              success: true, 
              message: '活動已在本地刪除，但無法與伺服器同步',
              localOnly: true,
              clientError: true,
              error: '無效的旅行計劃ID'
            };
          } catch (localError) {
            console.error('[deleteActivity] 本地刪除失敗:', localError);
          }
        }
        
        return { 
          success: false, 
          message: '無法刪除活動：提供了無效的計劃ID', 
          error: '無效的旅行計劃ID',
          clientError: true
        };
      }
      
      // 參數驗證 - 確保 activityId 存在且不是 'undefined' 字符串
      if (!activityId || activityId === 'undefined' || activityId === 'null') {
        console.error('[deleteActivity] 刪除活動時提供了無效的活動ID:', activityId);
        return { 
          success: false, 
          message: '無法刪除活動：提供了無效的活動ID', 
          error: '無效的活動ID',
          clientError: true
        };
      }
      
      // 保存當前使用的計劃ID到本地存儲中
      localStorage.setItem('travo_last_plan_id', planId);
      
      // 檢查活動ID是否為索引格式
      const indexMatch = activityId.match(/^idx-(\d+)-(\d+)$/);
      let apiUrl: string;
      let usingIndexFormat = false;
      
      if (indexMatch) {
        // 使用索引格式：idx-dayIndex-activityIndex
        const dayIndex = indexMatch[1];
        const activityIndex = indexMatch[2];
        console.log(`[deleteActivity] 檢測到索引格式的活動ID，使用索引API路徑，日期索引: ${dayIndex}, 活動索引: ${activityIndex}`);
        apiUrl = `${API_BASE_URL}/travel-plans/${planId}/days/${dayIndex}/activities/${activityIndex}`;
        usingIndexFormat = true;
      } else {
        // 檢查活動ID格式是否為UUID
        const isUuidFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activityId);
        if (!isUuidFormat) {
          console.warn(`[deleteActivity] 檢測到非UUID格式的活動ID: ${activityId}，此活動可能無法在後端找到`);
        }
        
        // 使用標準活動ID路徑
        apiUrl = `${API_BASE_URL}/travel-plans/${planId}/activities/${activityId}`;
      }
      
      const token = localStorage.getItem('travo_auth_token');
      if (!token) {
        console.error('[deleteActivity] 未找到認證令牌，無法刪除活動');
        
        // 嘗試本地刪除
        this.saveLocalDeletion(activityId);
        
        return { 
          success: false, 
          message: '未找到認證令牌，請重新登入', 
          error: '未找到認證令牌',
          clientError: true,
          localOnly: true
        };
      }

      console.log(`[deleteActivity] 正在發送API請求刪除活動，完整 URL: ${apiUrl}`);
      
      try {
        // 嘗試調用 API 刪除活動
        const response = await this.fetchWithRetry(apiUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
        });
        
        const data = await response.json();
        console.log(`[deleteActivity] API 回應:`, data);
        
        // 特別處理權限錯誤
        if (data.error_code === 'permission_denied') {
          console.error(`[deleteActivity] 刪除活動權限錯誤: ${data.message}`);
          return {
            success: false,
            message: '您沒有權限刪除此活動。請確認您是此旅行計劃的擁有者，或重新登入後再試。',
            error: data.message,
            clientError: true,
            db_verification: false
          };
        }
        
        // 正常回應
        if (data.success) {
          // 從本地緩存中移除此計劃
          this.clearCachedPlan(planId);
          
          // 記錄成功結果
          console.log(`[deleteActivity] 活動刪除成功，db_verification=${data.db_verification}`);
          
          // 檢查是否真的從數據庫刪除了
          if (data.db_verification === false) {
            console.warn('[deleteActivity] 警告: 活動可能未成功從數據庫中刪除');
            this.saveLocalDeletion(activityId);
            return {
              success: true,
              message: '活動已從界面移除，但在數據庫更新時遇到問題。已設置為在本地隱藏此活動。',
              db_verification: false,
              data: data.deleted_activity
            };
          }
          
          return {
            success: true,
            message: '活動刪除成功',
            db_verification: true,
            data: data.deleted_activity
          };
        } else {
          console.error(`[deleteActivity] 刪除活動失敗: ${data.message}`);
          
          // 判斷是客戶端錯誤還是服務器錯誤
          const isClientError = response.status >= 400 && response.status < 500;
          
          return {
            success: false,
            message: data.message || '刪除活動失敗',
            error: data.error || '未知錯誤',
            clientError: isClientError,
            serverError: !isClientError
          };
        }
      } catch (apiError: any) {
        // 網絡錯誤處理
        console.error(`[deleteActivity] 刪除活動的網絡請求出錯:`, apiError);
        console.error('[deleteActivity] 錯誤類型:', apiError.name);
        console.error('[deleteActivity] 錯誤訊息:', apiError.message);
        
        // 網絡錯誤情況下，嘗試本地刪除
        this.saveLocalDeletion(activityId);
        
        return { 
          success: true, 
          message: '刪除活動時發生網絡錯誤，但已在本地標記為已刪除', 
          error: apiError.message,
          serverError: true,
          localOnly: true
        };
      }
    } catch (error: any) {
      console.error(`[deleteActivity] 刪除活動時出錯:`, error);
      
      // 出現任何未捕獲的錯誤，嘗試本地刪除
      if (activityId) {
        this.saveLocalDeletion(activityId);
      }
      
      return { 
        success: true, 
        message: '刪除活動失敗，但已在本地標記為已刪除', 
        error: error.message,
        serverError: true,
        localOnly: true
      };
    }
  }
  
  /**
   * 將活動ID保存到本地存儲，標記為已刪除
   * @param activityId 活動ID
   */
  private saveLocalDeletion(activityId: string): void {
    if (!activityId) return;
    
    try {
      // 獲取當前已刪除的活動列表
      const key = 'travo_deleted_activities';
      const storedData = localStorage.getItem(key);
      let deletedIds: string[] = [];
      
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          if (Array.isArray(parsedData)) {
            deletedIds = parsedData;
          }
        } catch (e) {
          console.error('解析本地刪除記錄失敗:', e);
        }
      }
      
      // 如果活動ID已經在列表中，不重複添加
      if (!deletedIds.includes(activityId)) {
        deletedIds.push(activityId);
        localStorage.setItem(key, JSON.stringify(deletedIds));
        console.log(`已將活動 ${activityId} 添加到本地刪除記錄`);
      }
    } catch (e) {
      console.error('保存本地刪除記錄失敗:', e);
    }
  }

  /**
   * 強制刷新並重新載入旅行計劃數據
   * 當活動刪除可能不一致時使用
   * @param planId 旅行計劃ID
   * @returns 刷新後的旅行計劃數據
   */
  async forceRefreshTravelPlan(planId: string) {
    try {
      console.log(`[forceRefreshTravelPlan] 強制刷新旅行計劃 ${planId}`);
      
      if (!planId || planId === 'undefined' || planId === 'null') {
        console.error('[forceRefreshTravelPlan] 提供了無效的計劃ID:', planId);
        throw new Error('無效的旅行計劃ID');
      }
      
      const token = localStorage.getItem('travo_auth_token');
      if (!token) {
        console.warn('[forceRefreshTravelPlan] 未找到認證令牌');
        throw new Error('未找到認證令牌，請重新登入');
      }
      
      // 移除任何本地緩存
      this.clearCachedPlan(planId);
      
      // 執行強制刷新請求
      const apiUrl = `${API_BASE_URL}/travel-plans/${planId}?force_refresh=true&_t=${Date.now()}`;
      console.log(`[forceRefreshTravelPlan] 發送GET請求到: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store'
        },
        cache: 'no-store'
      });
      
      console.log('[forceRefreshTravelPlan] API回應狀態:', response.status);
      
      if (!response.ok) {
        throw new Error(`請求失敗 (${response.status}): ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[forceRefreshTravelPlan] 獲取到的旅行計劃數據:', data);
      
      return data;
    } catch (error: any) {
      console.error('[forceRefreshTravelPlan] 強制刷新旅行計劃失敗:', error);
      throw error;
    }
  }
  
  /**
   * 清除本地緩存的旅行計劃
   * @param planId 旅行計劃ID
   */
  clearCachedPlan(planId: string) {
    if (!planId) return;
    
    try {
      // 清除與此計劃相關的所有本地存儲
      const cacheKeys = [
        `travo_plan_${planId}`,
        `travo_deleted_activities_${planId}`
      ];
      
      for (const key of cacheKeys) {
        if (localStorage.getItem(key)) {
          console.log(`[clearCachedPlan] 移除本地存儲項目: ${key}`);
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('[clearCachedPlan] 清除本地緩存時出錯:', error);
    }
  }

  // 測試 API 連接
  async testApiConnection() {
    try {
      console.log('測試 API 連接到:', API_BASE_URL);
      const results = {
        basicConnectionOk: false,
        authConnectionOk: false,
        basicStatus: null as number | null,
        authStatus: null as number | null,
        error: null as string | null,
        details: [] as Array<{endpoint: string, status: number | null, message: string}>
      };
      
      // 1. 測試基本連接（不需要認證）
      try {
        console.log('測試基本連接到 /health-check');
        const basicResponse = await fetch(`${API_BASE_URL}/health-check`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          mode: 'cors'
        });
        
        console.log('基本連接測試回應:', basicResponse.status, basicResponse.statusText);
        results.basicConnectionOk = basicResponse.ok;
        results.basicStatus = basicResponse.status;
        results.details.push({
          endpoint: '/health-check',
          status: basicResponse.status,
          message: basicResponse.ok ? '連接成功' : `連接失敗: ${basicResponse.statusText}`
        });
      } catch (error: any) {
        console.error('基本連接測試失敗:', error);
        results.details.push({
          endpoint: '/health-check',
          status: null,
          message: `連接失敗: ${error.message}`
        });
      }
      
      // 2. 測試 API 根路徑
      try {
        console.log('測試 API 根路徑');
        const rootResponse = await fetch(`${API_BASE_URL}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          mode: 'cors'
        });
        
        console.log('API 根路徑測試回應:', rootResponse.status, rootResponse.statusText);
        results.details.push({
          endpoint: '/',
          status: rootResponse.status,
          message: rootResponse.ok ? '連接成功' : `連接失敗: ${rootResponse.statusText}`
        });
      } catch (error: any) {
        console.error('API 根路徑測試失敗:', error);
        results.details.push({
          endpoint: '/',
          status: null,
          message: `連接失敗: ${error.message}`
        });
      }
      
      // 3. 測試認證連接
      const token = localStorage.getItem('travo_auth_token');
      if (token) {
        try {
          console.log('測試認證連接到 /auth/verify');
          const authResponse = await fetch(`${API_BASE_URL}/auth/verify`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            mode: 'cors'
          });
          
          console.log('認證連接測試回應:', authResponse.status, authResponse.statusText);
          results.authConnectionOk = authResponse.ok;
          results.authStatus = authResponse.status;
          results.details.push({
            endpoint: '/auth/verify',
            status: authResponse.status,
            message: authResponse.ok ? '認證成功' : `認證失敗: ${authResponse.statusText}`
          });
        } catch (error: any) {
          console.error('認證連接測試失敗:', error);
          results.details.push({
            endpoint: '/auth/verify',
            status: null,
            message: `認證失敗: ${error.message}`
          });
        }
        
        // 4. 測試旅行計劃 API
        try {
          console.log('測試旅行計劃 API 連接到 /travel-plans');
          const plansResponse = await fetch(`${API_BASE_URL}/travel-plans`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            mode: 'cors'
          });
          
          console.log('旅行計劃 API 測試回應:', plansResponse.status, plansResponse.statusText);
          results.details.push({
            endpoint: '/travel-plans',
            status: plansResponse.status,
            message: plansResponse.ok ? '連接成功' : `連接失敗: ${plansResponse.statusText}`
          });
        } catch (error: any) {
          console.error('旅行計劃 API 測試失敗:', error);
          results.details.push({
            endpoint: '/travel-plans',
            status: null,
            message: `連接失敗: ${error.message}`
          });
        }
      } else {
        results.details.push({
          endpoint: '/auth/verify',
          status: null,
          message: '未嘗試認證連接 (沒有令牌)'
        });
        
        results.details.push({
          endpoint: '/travel-plans',
          status: null,
          message: '未嘗試旅行計劃 API 連接 (沒有令牌)'
        });
      }
      
      // 添加網絡環境診斷
      results.details.push({
        endpoint: '診斷信息',
        status: null,
        message: `當前頁面 URL: ${window.location.href}, API URL: ${API_BASE_URL}`
      });
      
      return results;
    } catch (error: any) {
      console.error('API 連接測試失敗:', error.message);
      return {
        basicConnectionOk: false,
        authConnectionOk: false,
        error: error.message,
        details: [{
          endpoint: '全局錯誤',
          status: null,
          message: `測試過程發生錯誤: ${error.message}`
        }]
      };
    }
  }

  /**
   * 獲取所有公開的旅行計畫
   * @param options 可選參數，包含分頁、排序等設定
   * @returns 包含公開旅行計畫的回應
   */
  async getPublicTravelPlans(options: { 
    page?: number; 
    limit?: number; 
    sortBy?: string; 
    sortOrder?: 'asc' | 'desc';
    includePhotos?: boolean;
    includeActivities?: boolean;
  } = {}) {
    try {
      console.log('開始獲取公開旅行計畫', options);
      
      // 確保所有選項正確傳遞
      const queryParams = new URLSearchParams();
      
      if (options.page) queryParams.append('page', options.page.toString());
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.sortBy) queryParams.append('sortBy', options.sortBy);
      if (options.sortOrder) queryParams.append('sortOrder', options.sortOrder);
      
      // 使用後端API期望的參數名稱
      queryParams.append('include_photos', options.includePhotos === true ? 'true' : 'false');
      queryParams.append('include_activities', options.includeActivities === true ? 'true' : 'false');
      queryParams.append('include_days', 'true'); // 關鍵：確保包含days陣列
      queryParams.append('include_full_details', 'true'); // 確保包含完整詳細資訊
      
      console.log('API 查詢參數:', queryParams.toString());
      
      const response = await fetch(`${API_BASE_URL}/travel-plans/public?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        mode: 'cors'
      });
      
      console.log('API回應狀態:', response.status, response.statusText);
      
      // 獲取原始文本以檢查JSON格式
      const rawText = await response.text();
      console.log('原始回應前100字符:', rawText.substring(0, 100) + '...');
      
      // 將文本解析為JSON
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        console.error('解析JSON失敗:', e);
        throw new Error('無法解析服務器回應');
      }
      
      if (!response.ok) {
        console.error('API請求不成功:', response.status, response.statusText);
        console.error('API錯誤詳情:', data);
        throw new Error(data.message || `請求失敗 (${response.status}): ${response.statusText}`);
      }
      
      // 處理返回數據
      let processedData = data;
      
      // 處理數據，確保所有計劃的days和activities屬性格式正確
      const processPlans = (plans: any[]) => {
        return plans.map((plan: any) => {
          // 確保計劃有正確的ID
          if (!plan.id && plan._id) {
            plan.id = plan._id;
          } else if (!plan.id && plan.plan_id) {
            plan.id = plan.plan_id;
          }
          
          // 檢查並處理days字段
          if (plan.days && typeof plan.days === 'string') {
            try {
              console.log(`計劃 ${plan.title} 的days是字符串，嘗試解析`);
              plan.days = JSON.parse(plan.days);
            } catch (e) {
              console.error(`無法解析計劃 ${plan.title} 的days字符串:`, e);
              plan.days = []; // 設置為空陣列避免後續錯誤
            }
          }
          
          // 檢查並處理activities字段
          if (plan.activities && typeof plan.activities === 'string') {
            try {
              console.log(`計劃 ${plan.title} 的activities是字符串，嘗試解析`);
              plan.activities = JSON.parse(plan.activities);
            } catch (e) {
              console.error(`無法解析計劃 ${plan.title} 的activities字符串:`, e);
              plan.activities = []; // 設置為空陣列避免後續錯誤
            }
          }
          
          // 檢查封面圖片
          if (plan.cover_image && plan.cover_image.startsWith('/')) {
            plan.cover_image = `${window.location.origin}${plan.cover_image}`;
          }
          
          // 如果存在plan_details字段且缺少days，嘗試從plan_details中提取
          if (!plan.days && plan.plan_details) {
            try {
              const details = typeof plan.plan_details === 'string' 
                ? JSON.parse(plan.plan_details) 
                : plan.plan_details;
                
              if (details.days) {
                plan.days = details.days;
                console.log(`從plan_details中提取了days數據，共${plan.days.length}天`);
              }
            } catch (e) {
              console.error('無法從plan_details提取days:', e);
            }
          }
          
          // 確保days存在且為陣列
          if (!plan.days) {
            plan.days = [];
          }
          
          // 確保activities存在且為陣列
          if (!plan.activities) {
            plan.activities = [];
          }
          
          return plan;
        });
      };
      
      // 根據數據結構處理
      if (Array.isArray(data)) {
        processedData = processPlans(data);
      } else if (data && typeof data === 'object' && data.plans && Array.isArray(data.plans)) {
        data.plans = processPlans(data.plans);
        processedData = data;
      }
      
      console.log('成功獲取公開旅行計畫，返回數據結構:', 
        Array.isArray(processedData) 
          ? `陣列，包含${processedData.length}個計劃` 
          : `對象，包含${processedData.plans?.length || 0}個計劃`
      );
      
      return processedData;
    } catch (error: any) {
      console.error('獲取公開旅行計畫時出錯:', error);
      throw error;
    }
  }
}

export default new TravelPlanService();