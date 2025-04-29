#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import logging
from pymongo import MongoClient
from dotenv import load_dotenv

# 設置日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 確保能夠導入 app 模組
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# 加載環境變量
load_dotenv()

def test_connection():
    """測試 MongoDB Atlas 連接"""
    
    # 獲取連接字串
    mongo_uri = os.getenv('MONGO_URI')
    
    if not mongo_uri or '<db_password>' in mongo_uri:
        logger.error("請在 .env 文件中設置正確的 MONGO_URI，替換 <db_password> 為實際密碼")
        return False
    
    # 顯示連接字串（隱藏密碼）
    uri_parts = mongo_uri.split('@')
    if len(uri_parts) > 1:
        auth_part = uri_parts[0].split(':')
        if len(auth_part) > 2:
            masked_uri = f"{auth_part[0]}:***@{uri_parts[1]}"
            logger.info(f"正在連接到 MongoDB: {masked_uri}")
        else:
            logger.info("正在連接到 MongoDB (連接字串格式不標準)")
    else:
        logger.info("正在連接到 MongoDB (無法解析連接字串)")
        
    try:
        # 嘗試建立連接
        client = MongoClient(mongo_uri)
        
        # 測試連接 - 發送 ping 命令
        client.admin.command('ping')
        logger.info("MongoDB Atlas 連接成功!")
        
        # 獲取並列出數據庫信息
        db = client.travo
        logger.info(f"已連接到數據庫: {db.name}")
        
        # 列出集合
        collections = db.list_collection_names()
        if collections:
            logger.info(f"可用集合: {', '.join(collections)}")
        else:
            logger.info("數據庫中沒有集合。這是正常的，如果這是一個新的數據庫。")
        
        # 嘗試簡單操作 - 在測試集合中插入和查詢文檔
        try:
            test_collection = db.test_connection
            
            # 插入測試文檔
            doc_id = test_collection.insert_one({"test": "MongoDB Atlas 連接測試", "timestamp": "now"}).inserted_id
            logger.info(f"成功插入測試文檔，ID: {doc_id}")
            
            # 查詢測試文檔
            test_doc = test_collection.find_one({"_id": doc_id})
            logger.info(f"成功查詢文檔: {test_doc}")
            
            # 刪除測試文檔
            test_collection.delete_one({"_id": doc_id})
            logger.info("已刪除測試文檔")
            
        except Exception as e:
            logger.warning(f"數據操作測試失敗: {str(e)}")
            logger.warning("這可能是權限問題，但不影響基本連接功能")
        
        # 關閉連接
        client.close()
        return True
        
    except Exception as e:
        logger.error(f"MongoDB Atlas 連接失敗: {str(e)}")
        logger.error("請檢查以下可能的問題:")
        logger.error("1. 密碼是否正確")
        logger.error("2. IP 是否已添加到 MongoDB Atlas 白名單")
        logger.error("3. 網絡連接是否正常")
        logger.error("4. 集群是否正在運行")
        return False

if __name__ == "__main__":
    print("測試 MongoDB Atlas 連接...")
    if test_connection():
        print("\n✅ 成功! MongoDB Atlas 連接正常。")
        print("你的應用程式已準備好使用 MongoDB Atlas 了!")
    else:
        print("\n❌ 失敗! 無法連接到 MongoDB Atlas。")
        print("請檢查上面的錯誤信息，並修正問題。") 