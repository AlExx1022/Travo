import json
import logging
from bson import json_util
from pymongo import MongoClient

# 設置日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def view_database():
    """查看MongoDB數據庫中的內容"""
    try:
        # 連接到MongoDB
        client = MongoClient("mongodb://localhost:27017/")
        
        # 獲取數據庫列表
        db_list = client.list_database_names()
        logger.info(f"可用的數據庫: {db_list}")
        
        # 選擇travo數據庫
        db = client["travo"]
        
        # 獲取集合列表
        collections = db.list_collection_names()
        logger.info(f"travo數據庫中的集合: {collections}")
        
        # 查看每個集合中的文檔
        for collection_name in collections:
            collection = db[collection_name]
            count = collection.count_documents({})
            logger.info(f"集合 '{collection_name}' 中有 {count} 個文檔")
            
            # 獲取集合中的所有文檔
            documents = list(collection.find())
            
            if documents:
                # 打印第一個文檔的結構
                logger.info(f"集合 '{collection_name}' 的文檔結構示例:")
                # 使用json_util.dumps處理MongoDB特殊類型（如ObjectId, Date等）
                formatted_doc = json.loads(json_util.dumps(documents[0]))
                print(json.dumps(formatted_doc, indent=2, ensure_ascii=False))
                
                # 打印所有文檔的ID和關鍵信息
                logger.info(f"集合 '{collection_name}' 中的所有文檔:")
                for doc in documents:
                    if collection_name == "users":
                        # 對於用戶集合，顯示ID、用戶名和郵箱
                        print(f"ID: {doc['_id']}, 用戶名: {doc.get('username')}, 郵箱: {doc.get('email')}")
                    elif collection_name == "travel_plans":
                        # 對於旅行計劃集合，顯示ID、標題和目的地
                        print(f"ID: {doc['_id']}, 標題: {doc.get('title')}, 目的地: {doc.get('destination')}")
                    else:
                        # 對於其他集合，只顯示ID
                        print(f"ID: {doc['_id']}")
        
        return True
    except Exception as e:
        logger.error(f"查看數據庫失敗: {e}")
        return False

if __name__ == "__main__":
    logger.info("開始查看MongoDB數據庫內容...")
    view_database() 