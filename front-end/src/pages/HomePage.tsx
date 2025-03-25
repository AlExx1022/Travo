import Header from '../components/Header';

const HomePage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* 英雄區域 */}
        <div className="relative bg-gradient-to-r from-blue-800 to-indigo-900 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-center">
              <div>
                <h1 className="text-4xl font-extrabold sm:text-5xl sm:tracking-tight mb-4">
                  探索您的下一次旅行
                </h1>
                <p className="text-lg max-w-lg">
                  TRAVO 幫助您規劃完美旅行，從著名景點到隱藏寶藏，我們提供智能推薦和個性化行程。
                </p>
                <div className="mt-8 flex flex-col sm:flex-row">
                  <a
                    href="/build"
                    className="btn-primary text-center mb-3 sm:mb-0 sm:mr-3"
                  >
                    開始規劃
                  </a>
                  <a
                    href="/explore"
                    className="bg-white text-blue-800 hover:bg-gray-100 text-center font-medium py-2 px-4 rounded-md transition"
                  >
                    探索熱門目的地
                  </a>
                </div>
              </div>
              <div className="mt-12 lg:mt-0 hidden lg:block">
                <div className="relative mx-auto w-full max-w-md rounded-lg shadow-xl">
                  {/* 這裡可以放置旅行相關的圖片 */}
                  <div className="bg-gray-300 rounded-lg h-64"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 熱門目的地區域 */}
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">熱門目的地</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 東京卡片 */}
            <div className="card destination-card">
              <div className="image-container h-48 bg-gray-300 relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                  <h3 className="text-white text-xl font-bold">東京</h3>
                </div>
              </div>
              <div className="p-4">
                <p className="text-gray-600 mb-4">探索現代與傳統共存的大都市，從繁華的澀谷到古老的淺草寺。</p>
                <a href="/explore/tokyo" className="text-blue-600 hover:text-blue-800 font-medium">探索東京 &rarr;</a>
              </div>
            </div>
            
            {/* 京都卡片 */}
            <div className="card destination-card">
              <div className="image-container h-48 bg-gray-300 relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                  <h3 className="text-white text-xl font-bold">京都</h3>
                </div>
              </div>
              <div className="p-4">
                <p className="text-gray-600 mb-4">體驗日本傳統文化的心臟地帶，拜訪古老神社、寺廟和迷人的舊街道。</p>
                <a href="/explore/kyoto" className="text-blue-600 hover:text-blue-800 font-medium">探索京都 &rarr;</a>
              </div>
            </div>
            
            {/* 台北卡片 */}
            <div className="card destination-card">
              <div className="image-container h-48 bg-gray-300 relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                  <h3 className="text-white text-xl font-bold">台北</h3>
                </div>
              </div>
              <div className="p-4">
                <p className="text-gray-600 mb-4">品嚐美食、參觀歷史景點和現代摩天大樓，體驗獨特的台灣文化。</p>
                <a href="/explore/taipei" className="text-blue-600 hover:text-blue-800 font-medium">探索台北 &rarr;</a>
              </div>
            </div>
          </div>
        </div>
        
        {/* 特色區 */}
        <div className="bg-gray-100 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900">為何選擇 TRAVO？</h2>
              <p className="mt-4 text-xl text-gray-600">我們提供智能、個性化的旅行規劃體驗</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">智能規劃</h3>
                <p className="text-gray-600">使用AI技術為您創建最佳旅行行程，節省時間和精力。</p>
              </div>
              
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">當地體驗</h3>
                <p className="text-gray-600">發現每個目的地的獨特體驗和隱藏景點，而不僅僅是熱門景點。</p>
              </div>
              
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">省時省力</h3>
                <p className="text-gray-600">不再需要花費數小時研究和計劃，我們已經為您完成了。</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-gray-800 text-white">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-6 md:mb-0">
              <h3 className="text-lg font-bold mb-2">TRAVO</h3>
              <p className="text-gray-400">智能旅行規劃平台</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider mb-3">關於我們</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-white">公司簡介</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white">團隊成員</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white">加入我們</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider mb-3">熱門目的地</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-white">東京</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white">京都</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white">台北</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider mb-3">支援</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-white">常見問題</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white">聯絡我們</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white">隱私政策</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-700 text-center md:text-left">
            <p className="text-gray-400 text-sm">
              © 2025 TRAVO. 保留所有權利。
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage; 