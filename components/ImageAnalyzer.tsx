import React, { useState, useRef, useEffect, useMemo } from 'react';
import { analyzeImage } from '../services/geminiService';
import { Spinner } from './Spinner';
import { PhotoIcon, DocumentMagnifyingGlassIcon, XMarkIcon, CropIcon, ArrowsRightLeftIcon, AutoAwesomeIcon, InformationCircleIcon, AdjustmentsHorizontalIcon, ArrowPathIcon, SwitchHorizontalIcon, ArrowDownTrayIcon } from './Icons';
import { analyzerAspectRatios, AnalyzerAspectRatio } from '../types';

type ResizeMode = 'crop' | 'stretch';
type ImageProperties = {
    width: number;
    height: number;
    type: string;
    size: number;
    simplifiedRatio: string;
} | null;

interface ImageFilters {
  brightness: number;
  contrast: number;
  saturate: number;
  grayscale: number;
  sepia: number;
  invert: number;
  hueRotate: number;
}

const initialFilterState: ImageFilters = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  grayscale: 0,
  sepia: 0,
  invert: 0,
  hueRotate: 0,
};

// Helper function to find the greatest common divisor
const gcd = (a: number, b: number): number => {
  return b === 0 ? a : gcd(b, a % b);
};

export const ImageAnalyzer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AnalyzerAspectRatio>('Auto');
  const [autoAspectRatio, setAutoAspectRatio] = useState<string | null>(null);
  const [resizeMode, setResizeMode] = useState<ResizeMode>('crop');
  const [imageProperties, setImageProperties] = useState<ImageProperties>(null);
  const [filters, setFilters] = useState<ImageFilters>(initialFilterState);
  const [rotation, setRotation] = useState<number>(0);
  const [isMirrored, setIsMirrored] = useState<boolean>(false);
  
  const [customRatios, setCustomRatios] = useState<string[]>([]);
  const [newRatio, setNewRatio] = useState<string>('');
  const [ratioInputError, setRatioInputError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedRatios = localStorage.getItem('customAnalyzerRatios');
      if (storedRatios) {
        const parsed = JSON.parse(storedRatios);
        if (Array.isArray(parsed)) {
          setCustomRatios(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to parse custom ratios from localStorage", e);
    }
  }, []);

  const saveCustomRatios = (ratios: string[]) => {
    const uniqueRatios = [...new Set(ratios)];
    setCustomRatios(uniqueRatios);
    localStorage.setItem('customAnalyzerRatios', JSON.stringify(uniqueRatios));
  };

  const handleAddRatio = () => {
    const trimmedRatio = newRatio.trim();
    const ratioRegex = /^[1-9]\d*:[1-9]\d*$/;
    
    if (!ratioRegex.test(trimmedRatio)) {
      setRatioInputError('Invalid format. Use W:H (e.g., 5:4).');
      return;
    }
    if ([...analyzerAspectRatios, ...customRatios, 'Auto'].includes(trimmedRatio)) {
      setRatioInputError('This aspect ratio already exists.');
      return;
    }

    saveCustomRatios([...customRatios, trimmedRatio]);
    setNewRatio('');
    setRatioInputError(null);
  };

  const handleRemoveRatio = (ratioToRemove: string) => {
    const updatedRatios = customRatios.filter(r => r !== ratioToRemove);
    saveCustomRatios(updatedRatios);
    if (selectedAspectRatio === ratioToRemove) {
      setSelectedAspectRatio('Auto');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const newPreviewUrl = URL.createObjectURL(file);
      setSelectedFile(file);
      setPreviewUrl(newPreviewUrl);
      setAnalysis('');
      setError(null);
      setImageProperties(null);
      setFilters(initialFilterState);
      setRotation(0);
      setIsMirrored(false);

      const image = new Image();
      image.onload = () => {
        const commonDivisor = gcd(image.naturalWidth, image.naturalHeight);
        setAutoAspectRatio(`${image.naturalWidth}:${image.naturalHeight}`);
        setSelectedAspectRatio('Auto');
        setImageProperties({
            width: image.naturalWidth,
            height: image.naturalHeight,
            type: file.type,
            size: file.size,
            simplifiedRatio: `${image.naturalWidth / commonDivisor}:${image.naturalHeight / commonDivisor}`
        });
      };
      image.onerror = () => {
        setAutoAspectRatio(null);
        setSelectedAspectRatio('16:9');
        setImageProperties(null);
      };
      image.src = newPreviewUrl;
    }
  };
  
  const allAspectRatios = ['Auto', ...analyzerAspectRatios, ...customRatios];

  const generateFilterString = (f: ImageFilters): string => {
    return [
        `brightness(${f.brightness}%)`,
        `contrast(${f.contrast}%)`,
        `saturate(${f.saturate}%)`,
        `grayscale(${f.grayscale}%)`,
        `sepia(${f.sepia}%)`,
        `invert(${f.invert}%)`,
        `hue-rotate(${f.hueRotate}deg)`,
    ].join(' ');
  };

  const imageTransform = useMemo(() => {
    return [
      `rotate(${rotation}deg)`,
      isMirrored ? 'scaleX(-1)' : '',
    ].filter(Boolean).join(' ');
  }, [rotation, isMirrored]);


  const handleFilterChange = (filterName: keyof ImageFilters, value: number) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const getProcessedImageAsDataUrl = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!selectedFile || !previewUrl) {
          return reject(new Error('Please select an image file first.'));
        }
    
        let effectiveAspectRatio = selectedAspectRatio === 'Auto' ? autoAspectRatio : selectedAspectRatio;
    
        if (!effectiveAspectRatio) {
          return reject(new Error('Could not determine aspect ratio. Please select one manually.'));
        }

        const image = new Image();
        image.src = previewUrl;
        
        image.onload = () => {
            try {
                // Create a temporary canvas to draw the rotated and filtered image
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                if (!tempCtx) return reject(new Error('Could not get temp canvas context'));
                
                const angleRad = (rotation * Math.PI) / 180;
                const cos = Math.abs(Math.cos(angleRad));
                const sin = Math.abs(Math.sin(angleRad));
                
                const rotatedWidth = image.naturalWidth * cos + image.naturalHeight * sin;
                const rotatedHeight = image.naturalWidth * sin + image.naturalHeight * cos;
                
                tempCanvas.width = rotatedWidth;
                tempCanvas.height = rotatedHeight;
                
                tempCtx.filter = generateFilterString(filters);
                
                tempCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
                tempCtx.rotate(angleRad);
                if (isMirrored) {
                  tempCtx.scale(-1, 1);
                }
                tempCtx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
                
                const finalCanvas = document.createElement('canvas');
                const finalCtx = finalCanvas.getContext('2d');
                if (!finalCtx) return reject(new Error('Could not get final canvas context'));
                
                const [ratioW, ratioH] = effectiveAspectRatio.split(':').map(Number);
                const targetAspectRatio = ratioW / ratioH;
                
                const outputWidth = 1024;
                const outputHeight = outputWidth / targetAspectRatio;
                finalCanvas.width = outputWidth;
                finalCanvas.height = outputHeight;

                if (resizeMode === 'stretch') {
                    finalCtx.drawImage(tempCanvas, 0, 0, outputWidth, outputHeight);
                } else { // crop
                    const sourceImage = tempCanvas;
                    const imageAspectRatio = sourceImage.width / sourceImage.height;
                    
                    let sx = 0, sy = 0, sWidth = sourceImage.width, sHeight = sourceImage.height;
                    
                    if (imageAspectRatio > targetAspectRatio) {
                        sWidth = sourceImage.height * targetAspectRatio;
                        sx = (sourceImage.width - sWidth) / 2;
                    } else if (imageAspectRatio < targetAspectRatio) {
                        sHeight = sourceImage.width / targetAspectRatio;
                        sy = (sourceImage.height - sHeight) / 2;
                    }
                    finalCtx.drawImage(sourceImage, sx, sy, sWidth, sHeight, 0, 0, outputWidth, outputHeight);
                }
                
                const mimeType = (selectedFile.type === 'image/jpeg' || selectedFile.type === 'image/png') ? selectedFile.type : 'image/png';
                resolve(finalCanvas.toDataURL(mimeType));
            } catch (e) {
                reject(e);
            }
        };
        
        image.onerror = () => reject(new Error('Failed to load image file for processing.'));
    });
  }

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    setAnalysis('');

    try {
        const dataUrl = await getProcessedImageAsDataUrl();
        const base64Data = dataUrl.split(',')[1];
        const result = await analyzeImage({ mimeType: selectedFile.type, data: base64Data });
        setAnalysis(result);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedFile) return;
    
    // Briefly indicate activity, can be expanded if processing is slow
    const originalError = error;
    setError(null);

    try {
        const dataUrl = await getProcessedImageAsDataUrl();
        const link = document.createElement('a');
        link.href = dataUrl;
        
        const nameParts = selectedFile.name.split('.');
        const extension = nameParts.pop();
        const name = nameParts.join('.');
        link.download = `${name}-edited.${(selectedFile.type === 'image/jpeg' ? 'jpg' : 'png')}`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred during download preparation.');
    } finally {
        // Restore original error if there was one
        if(originalError) setError(originalError);
    }
  };
  
  const resizeModeButtonClass = (mode: ResizeMode) => `flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 ${resizeMode === mode ? 'bg-indigo-600 text-white shadow' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`;
  
  const getDisplayAspectRatio = () => {
    let ratio = selectedAspectRatio === 'Auto' ? autoAspectRatio : selectedAspectRatio;
    if (!ratio || ratio === 'Auto') return '16 / 9';
    return ratio.replace(':', ' / ');
  };

  const displayedImageInfo = useMemo(() => {
    if (!imageProperties) return null;
    const { width, height, simplifiedRatio } = imageProperties;
    return `${width}x${height} (${simplifiedRatio})`;
  }, [imageProperties]);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div 
        style={{ aspectRatio: getDisplayAspectRatio() }}
        className="w-full bg-gray-700/50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-600 overflow-hidden relative transition-all duration-300">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" disabled={loading} />
        {previewUrl ? (
          <img 
            src={previewUrl} 
            alt="Preview" 
            className={`max-w-full max-h-full transition-transform duration-300 ${resizeMode === 'crop' ? 'object-cover w-full h-full' : 'object-contain'}`}
            style={{ filter: generateFilterString(filters), transform: imageTransform }}
          />
        ) : (
          <div className="text-center text-gray-500 p-4">
             <PhotoIcon className="w-16 h-16 mx-auto mb-2"/>
            <p>Upload an image to analyze.</p>
          </div>
        )}
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="grid grid-cols-1 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Resize Mode</label>
                <div className="flex gap-2">
                    <button onClick={() => setResizeMode('crop')} className={resizeModeButtonClass('crop')} disabled={loading}><CropIcon className="w-5 h-5"/>Crop</button>
                    <button onClick={() => setResizeMode('stretch')} className={resizeModeButtonClass('stretch')} disabled={loading}><ArrowsRightLeftIcon className="w-5 h-5"/>Stretch</button>
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex justify-between">
                    <span>Rotation & Transform</span>
                    <span className="font-mono">{rotation.toFixed(0)}°</span>
                </label>
                 <div className="flex items-center gap-2">
                    <input
                        type="range"
                        min="-180"
                        max="180"
                        step="1"
                        value={rotation}
                        onChange={(e) => setRotation(e.target.valueAsNumber)}
                        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        disabled={loading}
                    />
                    <button
                        onClick={() => setRotation(0)}
                        className="p-2 rounded-md bg-gray-600 text-gray-300 hover:bg-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
                        disabled={loading}
                        aria-label="Reset rotation"
                    >
                        <ArrowPathIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setIsMirrored(prev => !prev)}
                        className={`p-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 ${ isMirrored ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500' }`}
                        disabled={loading}
                        aria-label="Mirror image horizontally"
                    >
                        <SwitchHorizontalIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
        <div>
            <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">Aspect Ratio</label>
                {imageProperties && (
                    <span className="text-xs font-mono text-gray-400 bg-gray-700 px-2 py-1 rounded-md">
                        {displayedImageInfo}
                    </span>
                )}
            </div>
            <div className="flex flex-wrap gap-2">
            {allAspectRatios.map((ratio) => {
                const isAuto = ratio === 'Auto';
                const isSelected = selectedAspectRatio === ratio;
                const isDisabled = loading || (isAuto && !autoAspectRatio);
                return(
                    <button key={ratio} onClick={() => setSelectedAspectRatio(ratio)}
                        className={`flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed ${isSelected ? 'bg-indigo-600 text-white shadow' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
                        disabled={isDisabled}
                    >
                    {isAuto && <AutoAwesomeIcon className="w-5 h-5 mr-1.5" />}
                    {ratio}
                    </button>
                )
            })}
            </div>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-700/50 space-y-4">
        {selectedFile && (
            <>
                <details open>
                    <summary className="text-sm font-medium text-gray-300 cursor-pointer hover:text-white transition-colors flex items-center gap-2">
                        <AdjustmentsHorizontalIcon className="w-5 h-5" />
                        Image Filters
                    </summary>
                    <div className="mt-3 bg-gray-700/50 p-4 rounded-lg space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3">
                            {(['brightness', 'contrast', 'saturate'] as const).map(filterName => (
                                <div key={filterName}>
                                    <label htmlFor={filterName} className="capitalize text-xs font-medium text-gray-400 flex justify-between">
                                        <span>{filterName}</span>
                                        <span>{filters[filterName]}%</span>
                                    </label>
                                    <input id={filterName} type="range" min="0" max="200" value={filters[filterName]} onChange={(e) => handleFilterChange(filterName, e.target.valueAsNumber)} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                </div>
                            ))}
                            {(['grayscale', 'sepia', 'invert'] as const).map(filterName => (
                                <div key={filterName}>
                                    <label htmlFor={filterName} className="capitalize text-xs font-medium text-gray-400 flex justify-between">
                                        <span>{filterName}</span>
                                        <span>{filters[filterName]}%</span>
                                    </label>
                                    <input id={filterName} type="range" min="0" max="100" value={filters[filterName]} onChange={(e) => handleFilterChange(filterName, e.target.valueAsNumber)} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                </div>
                            ))}
                        </div>
                         <div className="pt-2">
                            <label htmlFor="hueRotate" className="text-xs font-medium text-gray-400 flex justify-between">
                                <span>Hue Rotate</span>
                                <span>{filters.hueRotate}°</span>
                            </label>
                            <input id="hueRotate" type="range" min="0" max="360" value={filters.hueRotate} onChange={(e) => handleFilterChange('hueRotate', e.target.valueAsNumber)} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                        </div>
                        <div className="flex justify-end pt-2 border-t border-gray-600/50">
                            <button onClick={() => setFilters(initialFilterState)} className="px-3 py-1 text-sm font-semibold rounded-full bg-red-600/50 text-red-200 hover:bg-red-600/80 transition-colors">
                                Reset Filters
                            </button>
                        </div>
                    </div>
                </details>
                <details>
                    <summary className="text-sm font-medium text-gray-300 cursor-pointer hover:text-white transition-colors flex items-center gap-2">
                        <InformationCircleIcon className="w-5 h-5" />
                        Image Details
                    </summary>
                    {imageProperties && (
                        <div className="mt-3 bg-gray-700/50 p-4 rounded-lg text-sm grid grid-cols-2 gap-x-4 gap-y-2">
                            <div className="font-semibold text-gray-400">Dimensions:</div>
                            <div className="text-gray-200 font-mono">{`${imageProperties.width} x ${imageProperties.height} px`}</div>
                            <div className="font-semibold text-gray-400">Resolution:</div>
                            <div className="text-gray-200 font-mono">{`${(imageProperties.width * imageProperties.height / 1000000).toFixed(1)} MP`}</div>
                            <div className="font-semibold text-gray-400">Size:</div>
                            <div className="text-gray-200 font-mono">{formatBytes(imageProperties.size)}</div>
                            <div className="font-semibold text-gray-400">Type:</div>
                            <div className="text-gray-200 font-mono">{imageProperties.type}</div>
                        </div>
                    )}
                </details>
            </>
        )}
        <details>
            <summary className="text-sm font-medium text-gray-300 cursor-pointer hover:text-white transition-colors">
                Manage Custom Ratios
            </summary>
            <div className="mt-3 space-y-3">
                <div className="flex gap-2 items-start">
                    <div className="flex-grow">
                        <input type="text" value={newRatio} onChange={(e) => { setNewRatio(e.target.value); setRatioInputError(null); }} placeholder="e.g., 5:4" className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                         {ratioInputError && <p className="text-red-400 text-xs mt-1">{ratioInputError}</p>}
                    </div>
                    <button onClick={handleAddRatio} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors text-sm">Add</button>
                </div>
                {customRatios.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {customRatios.map(ratio => (
                            <div key={ratio} className="flex items-center bg-gray-500 rounded-full pl-3 pr-2 py-1 text-sm font-medium">
                                <span>{ratio}</span>
                                <button onClick={() => handleRemoveRatio(ratio)} className="ml-2 text-gray-300 hover:text-white hover:bg-gray-400 rounded-full p-0.5 transition-colors"><XMarkIcon className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </details>
      </div>

       <div className="flex flex-col sm:flex-row gap-4">
        <button onClick={() => fileInputRef.current?.click()} disabled={loading} className="w-full flex-1 bg-gray-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors duration-300 flex justify-center items-center">
            <PhotoIcon className="w-5 h-5 mr-2" />
            {selectedFile ? "Change Image" : "Select Image"}
        </button>
        <button onClick={handleAnalyze} disabled={loading || !selectedFile} className="w-full flex-1 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed transition-colors duration-300 flex justify-center items-center">
          {loading ? (<><Spinner className="w-5 h-5 mr-2" />Analyzing...</>) : (<><DocumentMagnifyingGlassIcon className="w-5 h-5 mr-2" />Analyze Image</>)}
        </button>
        <button onClick={handleDownload} disabled={loading || !selectedFile} className="w-full flex-1 sm:w-auto bg-gray-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors duration-300 flex justify-center items-center">
            <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
            Download Image
        </button>
      </div>
      
      {error && <div className="text-red-400 bg-red-900/50 p-3 rounded-lg text-center">{error}</div>}

      {(loading || analysis) && (
        <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600 min-h-[100px]">
          <h3 className="text-lg font-semibold text-indigo-400 mb-2">Analysis Result</h3>
          {loading ? (<div className="flex items-center justify-center p-8"><Spinner className="w-8 h-8 text-gray-400" /></div>) : (<p className="text-gray-300 whitespace-pre-wrap">{analysis}</p>)}
        </div>
      )}
    </div>
  );
};