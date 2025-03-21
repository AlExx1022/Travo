import logging
import uuid
import json
from datetime import datetime
from bson.objectid import ObjectId

from app.models.db import get_db

# 設置日誌
logger = logging.getLogger(__name__)

class TravelPlan:
    """旅行計劃模型類"""
    
    collection_name = 'travel_plans'
    
    @classmethod
    def get_collection(cls):
        """獲取旅行計劃集合"""
        return get_db()[cls.collection_name]
    
    @classmethod
    def create_plan(cls, user_id, plan_data):
        """創建新旅行計劃"""
        # 確保用戶ID格式正確
        if isinstance(user_id, str):
            try:
                user_id = ObjectId(user_id)
            except:
                logger.error(f"無效的用戶ID格式: {user_id}")
                return None, "無效的用戶ID"
        
        # 創建計劃文檔
        now = datetime.utcnow()
        plan = {
            "user_id": user_id,
            "title": plan_data.get("title", f"{plan_data.get('destination', '未命名目的地')}旅行計劃"),
            "created_at": now,
            "updated_at": now,
            "is_public": plan_data.get("is_public", False),
            "version": "1.0",
            "destination": plan_data.get("destination", ""),
            "start_date": plan_data.get("start_date", ""),
            "end_date": plan_data.get("end_date", ""),
            "days": plan_data.get("days", []),
            "transportation": plan_data.get("transportation", {}),
            "accommodation": plan_data.get("accommodation", {}),
            "budget_estimate": plan_data.get("budget_estimate", {}),
            "weather_forecast": plan_data.get("weather_forecast", {}),
            "additional_info": plan_data.get("additional_info", {})
        }
        
        try:
            result = cls.get_collection().insert_one(plan)
            plan_id = result.inserted_id
            logger.info(f"成功創建旅行計劃: {plan['title']}, ID: {plan_id}")
            return plan_id, None
        except Exception as e:
            logger.error(f"創建旅行計劃失敗: {str(e)}")
            return None, f"創建旅行計劃失敗: {str(e)}"
    
    @classmethod
    def find_by_id(cls, plan_id):
        """通過ID查找旅行計劃"""
        if isinstance(plan_id, str):
            try:
                plan_id = ObjectId(plan_id)
            except:
                logger.error(f"無效的計劃ID格式: {plan_id}")
                return None
        
        return cls.get_collection().find_one({"_id": plan_id})
    
    @classmethod
    def find_by_user(cls, user_id, limit=10, skip=0):
        """查找用戶的所有旅行計劃"""
        if isinstance(user_id, str):
            try:
                user_id = ObjectId(user_id)
            except:
                logger.error(f"無效的用戶ID格式: {user_id}")
                return []
        
        cursor = cls.get_collection().find({"user_id": user_id})
        cursor = cursor.sort("created_at", -1).skip(skip).limit(limit)
        return list(cursor)
    
    @classmethod
    def find_public_plans(cls, limit=10, skip=0):
        """查找公開的旅行計劃"""
        cursor = cls.get_collection().find({"is_public": True})
        cursor = cursor.sort("created_at", -1).skip(skip).limit(limit)
        return list(cursor)
    
    @classmethod
    def search_plans(cls, query, limit=10, skip=0):
        """搜索旅行計劃"""
        # 創建搜索條件
        search_criteria = {
            "$or": [
                {"title": {"$regex": query, "$options": "i"}},
                {"destination": {"$regex": query, "$options": "i"}}
            ],
            "$and": [
                {"is_public": True}
            ]
        }
        
        cursor = cls.get_collection().find(search_criteria)
        cursor = cursor.sort("created_at", -1).skip(skip).limit(limit)
        return list(cursor)
    
    @classmethod
    def update_plan(cls, plan_id, update_data, user_id=None):
        """更新旅行計劃"""
        if isinstance(plan_id, str):
            try:
                plan_id = ObjectId(plan_id)
            except:
                logger.error(f"無效的計劃ID格式: {plan_id}")
                return False, "無效的計劃ID"
        
        # 如果提供了用戶ID，確保只有計劃擁有者可以更新
        if user_id:
            if isinstance(user_id, str):
                try:
                    user_id = ObjectId(user_id)
                except:
                    logger.error(f"無效的用戶ID格式: {user_id}")
                    return False, "無效的用戶ID"
            
            plan = cls.find_by_id(plan_id)
            if not plan or plan.get("user_id") != user_id:
                logger.warning(f"用戶 {user_id} 無權更新計劃 {plan_id}")
                return False, "無權更新此計劃"
        
        # 準備更新數據
        update_data["updated_at"] = datetime.utcnow()
        
        try:
            result = cls.get_collection().update_one(
                {"_id": plan_id},
                {"$set": update_data}
            )
            if result.modified_count > 0:
                logger.info(f"成功更新旅行計劃: {plan_id}")
                return True, None
            return False, "計劃更新失敗"
        except Exception as e:
            logger.error(f"更新旅行計劃失敗: {str(e)}")
            return False, f"更新旅行計劃失敗: {str(e)}"
    
    @classmethod
    def delete_plan(cls, plan_id, user_id=None):
        """刪除旅行計劃"""
        if isinstance(plan_id, str):
            try:
                plan_id = ObjectId(plan_id)
            except:
                logger.error(f"無效的計劃ID格式: {plan_id}")
                return False, "無效的計劃ID"
        
        # 如果提供了用戶ID，確保只有計劃擁有者可以刪除
        if user_id:
            if isinstance(user_id, str):
                try:
                    user_id = ObjectId(user_id)
                except:
                    logger.error(f"無效的用戶ID格式: {user_id}")
                    return False, "無效的用戶ID"
            
            plan = cls.find_by_id(plan_id)
            if not plan or plan.get("user_id") != user_id:
                logger.warning(f"用戶 {user_id} 無權刪除計劃 {plan_id}")
                return False, "無權刪除此計劃"
        
        try:
            result = cls.get_collection().delete_one({"_id": plan_id})
            if result.deleted_count > 0:
                logger.info(f"成功刪除旅行計劃: {plan_id}")
                return True, None
            return False, "計劃刪除失敗"
        except Exception as e:
            logger.error(f"刪除旅行計劃失敗: {str(e)}")
            return False, f"刪除旅行計劃失敗: {str(e)}"
    
    @classmethod
    def save_plan_to_file(cls, plan_id, file_path=None):
        """將旅行計劃保存到文件"""
        plan = cls.find_by_id(plan_id)
        if not plan:
            logger.error(f"找不到計劃: {plan_id}")
            return False, "找不到計劃"
        
        # 將ObjectId轉換為字符串
        plan["_id"] = str(plan["_id"])
        plan["user_id"] = str(plan["user_id"])
        
        # 處理日期時間
        plan["created_at"] = plan["created_at"].isoformat()
        plan["updated_at"] = plan["updated_at"].isoformat()
        
        # 如果沒有指定文件路徑，生成一個
        if not file_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            destination = plan.get("destination", "unknown").replace(" ", "_")
            file_path = f"travel_plan_{destination}_{timestamp}.json"
        
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(plan, f, ensure_ascii=False, indent=2)
            logger.info(f"旅行計劃已保存到文件: {file_path}")
            return True, file_path
        except Exception as e:
            logger.error(f"保存旅行計劃到文件失敗: {str(e)}")
            return False, f"保存旅行計劃到文件失敗: {str(e)}"
    
    @classmethod
    def load_plan_from_file(cls, file_path, user_id=None):
        """從文件加載旅行計劃"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                plan_data = json.load(f)
            
            # 移除ID字段，以便創建新計劃
            if "_id" in plan_data:
                del plan_data["_id"]
            
            # 如果提供了用戶ID，使用它替換原計劃的用戶ID
            if user_id:
                plan_data["user_id"] = user_id
            elif "user_id" in plan_data:
                del plan_data["user_id"]
            
            # 重置創建和更新時間
            plan_data["created_at"] = datetime.utcnow()
            plan_data["updated_at"] = datetime.utcnow()
            
            # 創建新計劃
            return cls.create_plan(user_id, plan_data)
        except Exception as e:
            logger.error(f"從文件加載旅行計劃失敗: {str(e)}")
            return None, f"從文件加載旅行計劃失敗: {str(e)}" 