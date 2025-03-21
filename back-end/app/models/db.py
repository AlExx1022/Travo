import os
import logging
from pymongo import MongoClient
from dotenv import load_dotenv

# 設置日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 加載環境變量
load_dotenv()

# MongoDB連接字符串
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017')

class Database:
    """MongoDB數據庫連接管理類"""
    
    _instance = None
    _client = None
    _db = None
    
    @classmethod
    def get_instance(cls):
        """單例模式獲取數據庫實例"""
        if cls._instance is None:
            cls._instance = Database()
        return cls._instance
    
    def __init__(self):
        """初始化數據庫連接"""
        if Database._client is None:
            try:
                logger.info(f"正在連接到MongoDB: {MONGO_URI}")
                Database._client = MongoClient(MONGO_URI)
                Database._db = Database._client.travo
                logger.info("MongoDB連接成功")
            except Exception as e:
                logger.error(f"MongoDB連接失敗: {str(e)}")
                raise
    
    @property
    def db(self):
        """獲取數據庫對象"""
        return Database._db
    
    @property
    def client(self):
        """獲取客戶端對象"""
        return Database._client
    
    def close(self):
        """關閉數據庫連接"""
        if Database._client:
            Database._client.close()
            Database._client = None
            Database._db = None
            logger.info("MongoDB連接已關閉")

# 導出數據庫實例獲取函數
def get_db():
    """獲取數據庫實例"""
    return Database.get_instance().db 