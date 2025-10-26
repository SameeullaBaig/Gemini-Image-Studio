
import React, { useState } from 'react';
import { ImageGenerator } from './components/ImageGenerator';
import { ImageAnalyzer } from './components/ImageAnalyzer';
import { SparklesIcon, PhotoIcon, CubeTransparentIcon } from './components/Icons';

type ActiveTab = 'generate' | 'analyze';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('generate');

  const getTabClass = (tabName: ActiveTab) => {
    return `flex items-center justify-center w-full px-4 py-3 font-medium text-sm rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 ${
      activeTab === tabName
        ? 'bg-indigo-600 text-white shadow-lg'
        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
    }`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
                <CubeTransparentIcon className="w-10 h-10 text-indigo-400" />
                <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
                    Gemini Image Studio
                </h1>
            </div>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Your creative partner for AI-powered image generation and analysis.
          </p>
        </header>

        <main className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-2xl p-4 sm:p-6 w-full">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setActiveTab('generate')}
              className={getTabClass('generate')}
            >
              <SparklesIcon className="w-5 h-5 mr-2" />
              Generate
            </button>
            <button
              onClick={() => setActiveTab('analyze')}
              className={getTabClass('analyze')}
            >
              <PhotoIcon className="w-5 h-5 mr-2" />
              Analyze
            </button>
          </div>

          <div>
            {activeTab === 'generate' && <ImageGenerator />}
            {activeTab === 'analyze' && <ImageAnalyzer />}
          </div>
        </main>
        <footer className="text-center mt-8 text-gray-500 text-sm">
            <p>Powered by Google Gemini</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
