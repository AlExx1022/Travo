import logging
import uuid
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from bson.objectid import ObjectId

from app.models.db import get_db

# 設置日誌
logger = logging.getLogger(__name__)

class User:
    """用戶模型類"""
    
    collection_name = 'users'
    
    @classmethod
    def get_collection(cls):
        """獲取用戶集合"""
        return get_db()[cls.collection_name]
    
    @classmethod
    def create_user(cls, email, password):
        """創建新用戶"""
        # 檢查郵箱是否已存在
        if cls.find_by_email(email):
            logger.warning(f"郵箱 {email} 已存在")
            return None, "郵箱已存在"
        
        # 創建用戶文檔
        user = {
            "email": email,
            "password_hash": generate_password_hash(password),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "is_active": True,
            "profile": {
                "display_name": email.split('@')[0],  # 使用郵箱前綴作為顯示名稱
                "bio": "",
                "avatar_url": ""
            }
        }
        
        try:
            result = cls.get_collection().insert_one(user)
            user_id = result.inserted_id
            logger.info(f"成功創建用戶: {email}, ID: {user_id}")
            return user_id, None
        except Exception as e:
            logger.error(f"創建用戶失敗: {str(e)}")
            return None, f"創建用戶失敗: {str(e)}"
    
    @classmethod
    def find_by_id(cls, user_id):
        """通過ID查找用戶"""
        if isinstance(user_id, str):
            try:
                user_id = ObjectId(user_id)
            except:
                logger.error(f"無效的用戶ID格式: {user_id}")
                return None
        
        return cls.get_collection().find_one({"_id": user_id})
    
    @classmethod
    def find_by_email(cls, email):
        """通過郵箱查找用戶"""
        return cls.get_collection().find_one({"email": email})
    
    @classmethod
    def authenticate(cls, email, password):
        """驗證用戶憑證"""
        user = cls.find_by_email(email)
            
        if user and check_password_hash(user["password_hash"], password):
            logger.info(f"用戶 {email} 驗證成功")
            return user
        
        logger.warning(f"用戶 {email} 驗證失敗")
        return None
    
    @classmethod
    def update_profile(cls, user_id, profile_data):
        """更新用戶資料"""
        if isinstance(user_id, str):
            try:
                user_id = ObjectId(user_id)
            except:
                logger.error(f"無效的用戶ID格式: {user_id}")
                return False
        
        update_data = {
            "updated_at": datetime.utcnow()
        }
        
        # 更新資料字段
        if "display_name" in profile_data:
            update_data["profile.display_name"] = profile_data["display_name"]
        if "bio" in profile_data:
            update_data["profile.bio"] = profile_data["bio"]
        if "avatar_url" in profile_data:
            update_data["profile.avatar_url"] = profile_data["avatar_url"]
        
        try:
            result = cls.get_collection().update_one(
                {"_id": user_id},
                {"$set": update_data}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"更新用戶資料失敗: {str(e)}")
            return False
    
    @classmethod
    def change_password(cls, user_id, current_password, new_password):
        """更改用戶密碼"""
        user = cls.find_by_id(user_id)
        if not user:
            logger.warning(f"用戶ID不存在: {user_id}")
            return False, "用戶不存在"
        
        # 驗證當前密碼
        if not check_password_hash(user["password_hash"], current_password):
            logger.warning(f"用戶 {user['email']} 當前密碼驗證失敗")
            return False, "當前密碼不正確"
        
        try:
            result = cls.get_collection().update_one(
                {"_id": user_id},
                {
                    "$set": {
                        "password_hash": generate_password_hash(new_password),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            if result.modified_count > 0:
                logger.info(f"用戶 {user['email']} 密碼更改成功")
                return True, None
            return False, "密碼更新失敗"
        except Exception as e:
            logger.error(f"更改密碼失敗: {str(e)}")
            return False, f"更改密碼失敗: {str(e)}" 