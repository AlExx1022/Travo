#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
簡單的MongoDB資料庫查看腳本
"""

import os
import json
from pymongo import MongoClient
from datetime import datetime
from bson import ObjectId

# MongoDB 連接設定
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
DB_NAME = os.getenv('DB_NAME', 'travo')

# JSON 序列化處理 ObjectId 和 datetime
class JSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super(JSONEncoder, self).default(obj)

def pretty_print_json(data):
    """美化輸出 JSON 數據"""
    return json.dumps(data, ensure_ascii=False, indent=2, cls=JSONEncoder)

def connect_to_db():
    """連接到 MongoDB"""
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        print(f"成功連接到 MongoDB 資料庫: {DB_NAME}")
        return db
    except Exception as e:
        print(f"連接到 MongoDB 時出錯: {str(e)}")
        return None

def list_collections(db):
    """列出所有集合"""
    if db is None:
        return
    
    try:
        collections = db.list_collection_names()
        print("\n資料庫中的集合:")
        for i, collection in enumerate(collections, 1):
            print(f"{i}. {collection}")
        return collections
    except Exception as e:
        print(f"獲取集合列表時出錯: {str(e)}")
        return []

def view_collection_samples(db, collection_name, limit=5):
    """查看集合的樣本數據"""
    if db is None:
        return
    
    try:
        collection = db[collection_name]
        count = collection.count_documents({})
        print(f"\n集合 '{collection_name}' 共有 {count} 個文檔")
        
        if count == 0:
            print("集合為空，沒有數據可顯示")
            return
        
        print(f"顯示前 {min(limit, count)} 個文檔的摘要:")
        documents = collection.find().limit(limit)
        
        for i, doc in enumerate(documents, 1):
            print(f"\n--- 文檔 {i} ---")
            # 截取部分字段顯示
            summary = {}
            
            # 處理不同集合類型
            if collection_name == "travel_plans":
                summary = {
                    "_id": doc.get("_id"),
                    "title": doc.get("title", "無標題"),
                    "destination": doc.get("destination", "無目的地"),
                    "start_date": doc.get("start_date", "無日期"),
                    "end_date": doc.get("end_date", "無日期"),
                    "user_id": doc.get("user_id", "無用戶"),
                    "created_at": doc.get("created_at", "無創建時間")
                }
            elif collection_name == "users":
                summary = {
                    "_id": doc.get("_id"),
                    "email": doc.get("email", "無郵箱"),
                    "username": doc.get("username", "無用戶名"),
                    "created_at": doc.get("created_at", "無創建時間")
                }
            else:
                # 一般性處理，顯示所有頂層字段名
                summary = {k: (str(v) if len(str(v)) < 50 else str(v)[:47] + "...") for k, v in doc.items()}
            
            print(pretty_print_json(summary))
    except Exception as e:
        print(f"查看集合樣本時出錯: {str(e)}")

def view_document_detail(db, collection_name, doc_id):
    """查看特定文檔的詳細信息"""
    if db is None:
        return
    
    try:
        collection = db[collection_name]
        doc = collection.find_one({"_id": ObjectId(doc_id)})
        
        if doc:
            print(f"\n集合 '{collection_name}' 中文檔 {doc_id} 的詳細信息:")
            print(pretty_print_json(doc))
        else:
            print(f"未找到 ID 為 {doc_id} 的文檔")
    except Exception as e:
        print(f"查看文檔詳細信息時出錯: {str(e)}")

def main():
    """主函數"""
    print("=== MongoDB 資料庫查看工具 ===")
    
    # 連接到資料庫
    db = connect_to_db()
    if db is None:
        print("無法連接到資料庫，程序終止")
        return
    
    # 列出集合
    collections = list_collections(db)
    
    # 主循環
    while True:
        print("\n選擇操作:")
        print("1. 列出所有集合")
        print("2. 查看集合樣本數據")
        print("3. 查看特定文檔詳細信息")
        print("q. 退出")
        
        choice = input("\n請輸入選項: ")
        
        if choice == "1":
            list_collections(db)
        
        elif choice == "2":
            col_name = input("請輸入要查看的集合名稱: ")
            limit = input("請輸入要查看的文檔數量 (默認 5): ")
            try:
                limit = int(limit) if limit.strip() else 5
            except:
                limit = 5
            view_collection_samples(db, col_name, limit)
        
        elif choice == "3":
            col_name = input("請輸入集合名稱: ")
            doc_id = input("請輸入文檔 ID: ")
            view_document_detail(db, col_name, doc_id)
        
        elif choice.lower() == "q":
            print("退出程序")
            break
        
        else:
            print("無效選項，請重新選擇")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n程序被中斷")
    except Exception as e:
        print(f"\n執行過程中發生錯誤: {str(e)}") 