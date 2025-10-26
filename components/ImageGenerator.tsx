import React, { useState } from 'react';
import { generateImage } from '../services/geminiService';
import { generatorAspectRatios, GeneratorAspectRatio } from '../types';
import { Spinner } from './Spinner';
import { SparklesIcon, ArrowDownTrayIcon } from './Icons';

export const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<GeneratorAspectRatio>('1:1');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }

    setLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      const imageBytes = await generateImage(prompt, selectedAspectRatio);
      setImageUrl(`data:image/jpeg;base64,${imageBytes}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `gemini-generated-${Date.now()}.jpeg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="prompt" className="block text-sm font-medium text-gray-300">
          Image Prompt
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., A majestic lion wearing a crown, cinematic lighting"
          className="w-full h-24 p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Aspect Ratio
        </label>
        <div className="grid grid-cols-5 gap-2">
          {generatorAspectRatios.map((ratio) => (
            <button
              key={ratio}
              onClick={() => setSelectedAspectRatio(ratio)}
              className={`py-2 text-sm font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 ${
                selectedAspectRatio === ratio
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
              disabled={loading}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt}
          className="w-full flex-1 flex items-center justify-center bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed transition-colors duration-300"
        >
          {loading ? (
              <>
                  <Spinner className="w-5 h-5 mr-2" />
                  Generating...
              </>
          ) : (
              <>
                  <SparklesIcon className="w-5 h-5 mr-2"/>
                  Generate Image
              </>
          )}
        </button>
        {imageUrl && !loading && (
          <button
            onClick={handleDownload}
            className="w-full sm:w-auto flex items-center justify-center bg-gray-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors duration-300"
            >
            <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
            Download
          </button>
        )}
      </div>


      {error && <div className="text-red-400 bg-red-900/50 p-3 rounded-lg text-center">{error}</div>}

      <div className="w-full aspect-square bg-gray-700/50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-600 overflow-hidden">
        {loading && <Spinner className="w-12 h-12 text-gray-400" />}
        {!loading && imageUrl && (
          <img src={imageUrl} alt="Generated" className="w-full h-full object-contain" />
        )}
        {!loading && !imageUrl && (
          <div className="text-center text-gray-500">
            <SparklesIcon className="w-16 h-16 mx-auto mb-2"/>
            <p>Your generated image will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};