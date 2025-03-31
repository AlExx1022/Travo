// API URL設置 - 從環境變數中獲取
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true'; // 環境變數控制是否使用模擬數據
const API_TIMEOUT = 10000; // 設置API請求超時時間為10秒

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
console.log('使用的環境變數:', import.meta.env.VITE_API_URL || '未設置，使用預設值');
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
   * @returns 包含用戶所有旅行計劃的回應
   */
  async getUserTravelPlans() {
    try {
      console.log('開始獲取用戶旅行計劃數據');
      console.log('API 基礎 URL:', API_BASE_URL);
      
      const token = localStorage.getItem('travo_auth_token');
      if (!token) {
        console.warn('未找到認證令牌，無法獲取旅行計劃');
        throw new Error('未找到認證令牌，請重新登入');
      }
      
      console.log('已獲取認證令牌 (長度):', token.length);
      console.log('正在發送API請求獲取用戶旅行計劃，完整 URL:', `${API_BASE_URL}/travel-plans`);
      
      try {
        // 嘗試使用直接的 fetch 而不是 fetchWithRetry，以便獲取更詳細的錯誤信息
        const response = await fetch(`${API_BASE_URL}/travel-plans`, {
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
  async getTravelPlanById(planId: string) {
    try {
      if (!planId || planId === 'undefined') {
        console.error('無效的旅行計劃ID:', planId);
        throw new Error('無效的旅行計劃ID。請返回列表重新選擇有效的計劃。');
      }
      
      console.log(`開始獲取旅行計劃 ${planId} 的詳情`);
      
      const token = localStorage.getItem('travo_auth_token');
      if (!token) {
        console.warn('未找到認證令牌，無法獲取旅行計劃');
        throw new Error('未找到認證令牌，請重新登入');
      }

      console.log(`正在發送API請求獲取旅行計劃 ${planId}，完整 URL:`, `${API_BASE_URL}/travel-plans/${planId}`);
      
      try {
        const response = await fetch(`${API_BASE_URL}/travel-plans/${planId}`, {
          method: 'GET',
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
        
        // 檢查API返回的數據格式是否符合要求
        if (!data || typeof data !== 'object') {
          console.error('API返回的數據格式不正確:', data);
          throw new Error('API返回的數據格式不正確');
        }
        
        // 記錄完整的數據結構
        console.log(`旅行計劃 ${planId} 的完整數據:`, data);
        console.log(`旅行計劃 ${planId} 的所有頂層屬性:`, Object.keys(data));
        
        // 檢查所有可能的 ID 欄位
        console.log(`旅行計劃 ${planId} 的 ID 相關欄位:`, {
          id: data.id,
          _id: data._id,
          planId: data.planId,
          plan_id: data.plan_id
        });
        
        // 處理 MongoDB ID 不一致問題
        if (!data.id) {
          if (data._id) {
            console.log(`旅行計劃詳情缺少 id 欄位，從 _id 自動添加: ${data._id}`);
            data.id = data._id;
          } else if (data.planId) {
            console.log(`旅行計劃詳情缺少 id 欄位，從 planId 自動添加: ${data.planId}`);
            data.id = data.planId;
          } else if (data.plan_id) {
            console.log(`旅行計劃詳情缺少 id 欄位，從 plan_id 自動添加: ${data.plan_id}`);
            data.id = data.plan_id;
          } else {
            // 這裡我們使用 planId 參數作為臨時 ID
            console.log(`旅行計劃詳情沒有任何 ID 欄位，使用請求參數作為 ID: ${planId}`);
            data.id = planId;
          }
        }
        
        // 記錄完整的 API 回應結構
        console.log(`成功獲取旅行計劃 ${planId} 的詳情，ID 欄位確認:`, {
          id: data.id,
          _id: data._id,
          '欄位是否匹配': data.id === data._id
        });
        
        return data;
      } catch (networkError: any) {
        console.error(`獲取旅行計劃 ${planId} 的網絡請求出錯:`, networkError);
        console.error('錯誤類型:', networkError.name);
        console.error('錯誤訊息:', networkError.message);
        throw networkError;
      }
    } catch (error: any) {
      console.error(`獲取旅行計劃 ${planId} 時出錯:`, error);
      throw error;
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
   * @param planData 更新的旅行計劃數據
   * @returns 包含更新後的旅行計劃的回應
   */
  async updateTravelPlan(planId: string, planData: any) {
    try {
      console.log(`開始更新旅行計劃 ${planId}`);
      
      const token = localStorage.getItem('travo_auth_token');
      if (!token) {
        console.warn('未找到認證令牌，無法更新旅行計劃');
        throw new Error('未找到認證令牌，請重新登入');
      }

      console.log(`正在發送API請求更新旅行計劃 ${planId}，完整 URL:`, `${API_BASE_URL}/travel-plans/${planId}`);
      console.log('發送的數據:', JSON.stringify(planData).substring(0, 200) + '...');
      
      try {
        const response = await fetch(`${API_BASE_URL}/travel-plans/${planId}`, {
          method: 'PUT',
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
        
        console.log(`成功更新旅行計劃 ${planId}`);
        return data;
      } catch (networkError: any) {
        console.error(`更新旅行計劃 ${planId} 的網絡請求出錯:`, networkError);
        console.error('錯誤類型:', networkError.name);
        console.error('錯誤訊息:', networkError.message);
        throw networkError;
      }
    } catch (error: any) {
      console.error('更新旅行計劃時出錯:', error);
      throw error;
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
   * @returns 操作結果
   */
  async deleteActivity(planId: string, activityId: string) {
    try {
      console.log(`[deleteActivity] 開始從旅行計劃 ${planId} 刪除活動 ${activityId}`);
      
      // 參數驗證
      if (!planId || planId === 'undefined') {
        console.error('[deleteActivity] 刪除活動時提供了無效的計劃ID:', planId);
        throw new Error('無效的旅行計劃ID');
      }
      
      if (!activityId || activityId === 'undefined') {
        console.error('[deleteActivity] 刪除活動時提供了無效的活動ID:', activityId);
        throw new Error('無效的活動ID');
      }
      
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
        console.warn('[deleteActivity] 未找到認證令牌，無法刪除活動');
        throw new Error('未找到認證令牌，請重新登入');
      }

      console.log(`[deleteActivity] 正在發送API請求刪除活動，完整 URL:`, apiUrl);
      
      try {
        const response = await fetch(apiUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          mode: 'cors',
          credentials: 'same-origin'
        });
        
        console.log('[deleteActivity] API回應狀態:', response.status, response.statusText);
        
        // 嘗試解析響應數據
        let data;
        try {
          const text = await response.text();
          // 檢查回應是否為空
          if (text.trim()) {
            data = JSON.parse(text);
            console.log('[deleteActivity] API回應數據:', data);
          } else {
            console.warn('[deleteActivity] API回應為空');
            data = { success: true, message: '活動已刪除', emptyResponse: true };
          }
        } catch (parseError) {
          console.error('[deleteActivity] 解析API回應數據失敗:', parseError);
          data = { success: false, message: '無法解析API回應' };
        }
        
        if (!response.ok) {
          console.error('[deleteActivity] API請求不成功:', response.status, response.statusText);
          console.error('[deleteActivity] API錯誤詳情:', data);
          
          // 特殊處理404錯誤
          if (response.status === 404) {
            console.warn(`[deleteActivity] 活動 ${activityId} 在伺服器上不存在，但我們將視為刪除成功`);
            
            // 返回成功，但標記為僅本地刪除
            return { 
              success: true, 
              message: '活動在本地已刪除，但伺服器上未找到匹配的活動', 
              localOnly: true,
              serverMessage: data?.message || '找不到活動'
            };
          }
          
          throw new Error(data?.message || `請求失敗 (${response.status}): ${response.statusText}`);
        }
        
        console.log(`[deleteActivity] 成功刪除活動 ${activityId}`);
        return data;
      } catch (networkError: any) {
        // 檢查網絡錯誤是否是由於資源不存在（404）
        if (networkError.status === 404 || 
            (networkError.message && (
              networkError.message.includes('404') ||
              networkError.message.includes('Not Found') ||
              networkError.message.includes('找不到ID為')
            ))) {
          
          console.warn(`[deleteActivity] 活動 ${activityId} 在伺服器上不存在，將視為刪除成功`);
          return { 
            success: true, 
            message: '活動在本地已刪除，伺服器上可能不存在此活動', 
            localOnly: true,
            error: networkError.message
          };
        }
        
        // 其他網絡錯誤
        console.error(`[deleteActivity] 刪除活動的網絡請求出錯:`, networkError);
        console.error('[deleteActivity] 錯誤類型:', networkError.name);
        console.error('[deleteActivity] 錯誤訊息:', networkError.message);
        
        // 嘗試也將其視為成功，但加入警告
        // 這樣前端可以繼續正常運行，同時記錄到控制台
        return { 
          success: true, 
          message: '活動已在本地刪除，但在伺服器操作可能失敗', 
          localOnly: true,
          serverError: true,
          error: networkError.message
        };
      }
    } catch (error: any) {
      console.error(`[deleteActivity] 刪除活動時出錯:`, error);
      
      // 將所有錯誤視為本地成功，讓前端可以繼續工作
      return { 
        success: true, 
        message: '活動已在本地刪除，但無法與伺服器同步', 
        localOnly: true,
        clientError: true,
        error: error.message
      };
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
}

export default new TravelPlanService();