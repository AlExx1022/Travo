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
        
        # 確保每個活動都有有效的 UUID
        if "days" in plan_data and isinstance(plan_data["days"], list):
            import uuid
            import re
            uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            
            # 記錄活動數量
            total_activities = 0
            total_added_ids = 0
            
            for day_index, day in enumerate(plan_data["days"]):
                if "activities" in day and isinstance(day["activities"], list):
                    for act_index, activity in enumerate(day["activities"]):
                        total_activities += 1
                        
                        # 檢查活動是否有有效的 ID
                        if "id" not in activity or not activity["id"] or activity["id"] == "undefined":
                            activity["id"] = str(uuid.uuid4())
                            logger.info(f"創建計劃時為第 {day_index+1} 天第 {act_index+1} 個活動生成UUID: {activity['id']}")
                            total_added_ids += 1
                        # 檢查 ID 是否為有效的 UUID 格式
                        elif not re.match(uuid_pattern, activity["id"], re.I):
                            original_id = activity["id"]
                            activity["id"] = str(uuid.uuid4())
                            logger.info(f"創建計劃時替換第 {day_index+1} 天第 {act_index+1} 個活動的非UUID格式ID: {original_id} → {activity['id']}")
                            total_added_ids += 1
            
            # 記錄活動 ID 生成/替換情況
            if total_activities > 0:
                logger.info(f"創建計劃時共檢查 {total_activities} 個活動，生成/替換了 {total_added_ids} 個UUID（{round(total_added_ids/total_activities*100, 2)}%）")
        
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
            "budget": plan_data.get("budget", "0"),  # 添加預算欄位
            "travelers": plan_data.get("travelers", 1),  # 添加旅行人數欄位
            "days": plan_data.get("days", []),
        }
        
        # 記錄添加的預算和人數信息
        logger.info(f"創建旅行計劃 - 目的地: {plan['destination']}, 預算: {plan['budget']}, 旅行人數: {plan['travelers']}, 天數: {len(plan['days'])}")
        
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
        """根據ID查找旅行計劃"""
        if isinstance(plan_id, str):
            try:
                plan_id = ObjectId(plan_id)
            except:
                logger.error(f"無效的計劃ID格式: {plan_id}")
                return None
        
        try:
            # 查詢數據庫
            plan = cls.get_collection().find_one({"_id": plan_id})
            
            # 轉換ObjectId為字符串
            if plan:
                original_plan = plan.copy()  # 保存原始計劃以檢查更改
                
                plan["_id"] = str(plan["_id"])
                user_id = plan.get("user_id")
                if isinstance(user_id, ObjectId):
                    plan["user_id"] = str(user_id)
                
                # 確保計劃中的每個活動都有唯一ID
                uuid_changes_made = False  # 跟踪是否進行了ID修改
                if "days" in plan and isinstance(plan["days"], list):
                    for day_index, day in enumerate(plan["days"]):
                        if "activities" in day and isinstance(day["activities"], list):
                            import uuid
                            import re
                            
                            for act_index, activity in enumerate(day["activities"]):
                                # 如果活動沒有ID或ID無效，則生成新ID
                                if "id" not in activity or not activity["id"] or activity["id"] == "undefined":
                                    activity["id"] = str(uuid.uuid4())
                                    logger.info(f"為計劃 {plan_id} 第 {day_index+1} 天的第 {act_index+1} 個活動生成ID: {activity['id']}")
                                    uuid_changes_made = True
                                # 檢查ID是否為有效的UUID格式
                                elif not re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', activity["id"], re.I):
                                    original_id = activity["id"]
                                    activity["id"] = str(uuid.uuid4())
                                    logger.info(f"計劃 {plan_id} 第 {day_index+1} 天的第 {act_index+1} 個活動ID不是有效的UUID格式，已將 {original_id} 替換為 {activity['id']}")
                                    uuid_changes_made = True
                
                # 如果對活動ID進行了修改，保存到數據庫
                if uuid_changes_made:
                    try:
                        update_data = plan.copy()
                        # 恢復原始ObjectId，避免類型轉換問題
                        update_data["_id"] = plan_id
                        if "user_id" in update_data and isinstance(original_plan.get("user_id"), ObjectId):
                            update_data["user_id"] = original_plan["user_id"]
                        
                        # 更新計劃
                        result = cls.get_collection().update_one(
                            {"_id": plan_id},
                            {"$set": update_data}
                        )
                        if result.modified_count > 0:
                            logger.info(f"已更新計劃 {plan_id} 的活動ID並保存到數據庫")
                        else:
                            logger.warning(f"計劃 {plan_id} 的活動ID更新失敗")
                    except Exception as e:
                        logger.error(f"更新計劃 {plan_id} 的活動ID時出錯: {str(e)}")
            
            return plan
        except Exception as e:
            logger.error(f"查詢旅行計劃時出錯: {str(e)}")
            return None
    
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
                return False, {'message': '無效的計劃ID', 'error_code': 'invalid_plan_id'}
        
        # 如果提供了用戶ID，確保只有計劃擁有者可以更新
        if user_id:
            if isinstance(user_id, str):
                try:
                    user_id = ObjectId(user_id)
                except:
                    logger.error(f"無效的用戶ID格式: {user_id}")
                    return False, {'message': '無效的用戶ID', 'error_code': 'invalid_user_id'}
            
            plan = cls.find_by_id(plan_id)
            if not plan:
                logger.error(f"找不到計劃 {plan_id} 以進行權限檢查")
                return False, {'message': '找不到計劃', 'error_code': 'plan_not_found'}
            
            plan_owner_id = plan.get("user_id")
            if isinstance(plan_owner_id, ObjectId):
                plan_owner_id_str = str(plan_owner_id)
            else:
                plan_owner_id_str = str(plan_owner_id)
            
            user_id_str = str(user_id)
            
            if plan_owner_id_str != user_id_str:
                logger.warning(f"權限錯誤: 用戶 {user_id_str} 無權更新計劃 {plan_id}")
                logger.warning(f"權限詳情: 計劃擁有者={plan_owner_id_str}, 請求用戶={user_id_str}")
                return False, {"message": "無權更新此計劃", "error_code": "permission_denied"}
        
        # 確保每個活動都有有效的 UUID
        if "days" in update_data and isinstance(update_data["days"], list):
            import uuid
            import re
            uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            
            uuid_changes_made = False
            total_activities = 0
            total_added_ids = 0
            
            for day_index, day in enumerate(update_data["days"]):
                if "activities" in day and isinstance(day["activities"], list):
                    for act_index, activity in enumerate(day["activities"]):
                        total_activities += 1
                        
                        # 檢查活動是否有有效的 ID
                        if "id" not in activity or not activity["id"] or activity["id"] == "undefined":
                            activity["id"] = str(uuid.uuid4())
                            logger.info(f"更新計劃時為第 {day_index+1} 天第 {act_index+1} 個活動生成UUID: {activity['id']}")
                            uuid_changes_made = True
                            total_added_ids += 1
                        # 檢查 ID 是否為有效的 UUID 格式
                        elif not re.match(uuid_pattern, activity["id"], re.I):
                            original_id = activity["id"]
                            activity["id"] = str(uuid.uuid4())
                            logger.info(f"更新計劃時替換第 {day_index+1} 天第 {act_index+1} 個活動的非UUID格式ID: {original_id} → {activity['id']}")
                            uuid_changes_made = True
                            total_added_ids += 1
            
            # 記錄活動 ID 生成/替換情況
            if total_activities > 0:
                logger.info(f"更新計劃 {plan_id} 時共檢查 {total_activities} 個活動，生成/替換了 {total_added_ids} 個UUID")
                if uuid_changes_made:
                    logger.info(f"更新計劃過程中修改了活動ID，將保存這些更改")
        
        # 準備更新數據
        update_data["updated_at"] = datetime.utcnow()
        
        # 記錄更新計劃的初始狀態
        update_summary = {
            "days_count": len(update_data.get("days", [])),
            "activities_count": sum(len(day.get("activities", [])) for day in update_data.get("days", []))
        }
        logger.info(f"準備更新計劃 {plan_id}，天數: {update_summary['days_count']}, 活動總數: {update_summary['activities_count']}")
        
        try:
            # 檢查計劃是否存在
            original_plan = cls.get_collection().find_one({"_id": plan_id})
            if not original_plan:
                logger.error(f"計劃 {plan_id} 不存在，無法更新")
                return False, "計劃不存在，無法更新"
                
            # 記錄原始計劃的活動數量
            original_activities_count = sum(len(day.get("activities", [])) for day in original_plan.get("days", []))
            logger.info(f"原始計劃 {plan_id} 的活動總數: {original_activities_count}")
            
            # 確保不包含 _id 欄位，避免 MongoDB 錯誤
            if "_id" in update_data:
                logger.warning(f"更新數據中包含 _id 欄位，將其移除以避免 MongoDB 錯誤")
                del update_data["_id"]
            
            # 更新計劃
            result = cls.get_collection().update_one(
                {"_id": plan_id},
                {"$set": update_data}
            )
            
            # 詳細記錄更新結果
            if result.modified_count > 0:
                logger.info(f"成功更新旅行計劃: {plan_id}，影響文檔數: {result.modified_count}")
                
                # 驗證更新是否確實寫入數據庫
                updated_plan = cls.get_collection().find_one({"_id": plan_id})
                if updated_plan:
                    updated_activities_count = sum(len(day.get("activities", [])) for day in updated_plan.get("days", []))
                    logger.info(f"更新後計劃 {plan_id} 的活動總數: {updated_activities_count}")
                    
                    # 檢查活動數量是否符合預期
                    expected_activities = update_summary["activities_count"]
                    if updated_activities_count != expected_activities:
                        logger.warning(f"計劃 {plan_id} 的活動數量不符合預期! 預期: {expected_activities}, 實際: {updated_activities_count}")
                
                return True, None
            elif result.matched_count > 0:
                logger.info(f"旅行計劃匹配但無更改: {plan_id}，匹配文檔數: {result.matched_count}")
                
                # 驗證文檔是否確實保持不變
                current_plan = cls.get_collection().find_one({"_id": plan_id})
                if current_plan:
                    current_activities_count = sum(len(day.get("activities", [])) for day in current_plan.get("days", []))
                    if current_activities_count != original_activities_count:
                        logger.warning(f"警告：儘管報告無更改，但計劃 {plan_id} 的活動數量已變化! 原始: {original_activities_count}, 當前: {current_activities_count}")
                
                return True, None
            
            logger.warning(f"計劃更新失敗，未找到匹配文檔: {plan_id}")
            return False, "計劃更新失敗，未找到匹配文檔"
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