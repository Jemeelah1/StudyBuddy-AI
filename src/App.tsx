/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Upload, 
  BookOpen, 
  BrainCircuit, 
  CheckCircle2, 
  Loader2, 
  X, 
  ChevronRight,
  Sparkles,
  RefreshCw,
  HelpCircle,
  Type as TypeIcon,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
interface KeyTerm {
  term: string;
  definition: string;
}

interface Question {
  question: string;
  options: string[];
  answer: string;
}

interface AnalysisResult {
  summary: string;
  keyTerms: KeyTerm[];
  questions: Question[];
  encouragement: string;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default function App() {
  const [inputMode, setInputMode] = useState<'upload' | 'type'>('upload');
  const [image, setImage] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState<Record<number, boolean>>({});

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
        setError(null);
        setSelectedAnswers({});
        setShowResults({});
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeContent = async () => {
    if (inputMode === 'upload' && !image) return;
    if (inputMode === 'type' && !inputText.trim()) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const parts: any[] = [];
      
      if (inputMode === 'upload' && image) {
        const base64Data = image.split(',')[1];
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data,
          },
        });
        parts.push({
          text: "You are an expert tutor. Analyze the provided image of study notes or textbook pages. Provide a 2-sentence summary, 5 key terms with definitions, and 3 multiple-choice questions. Be supportive and encouraging.",
        });
      } else {
        parts.push({
          text: `You are an expert tutor. Analyze the following study notes provided by the user. Provide a 2-sentence summary, 5 key terms with definitions, and 3 multiple-choice questions. Be supportive and encouraging.\n\nNotes Content:\n${inputText}`,
        });
      }
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING, description: "A 2-sentence summary of the content." },
              keyTerms: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    term: { type: Type.STRING },
                    definition: { type: Type.STRING }
                  },
                  required: ["term", "definition"]
                }
              },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    answer: { type: Type.STRING, description: "The correct option (e.g., 'A')" }
                  },
                  required: ["question", "options", "answer"]
                }
              },
              encouragement: { type: Type.STRING, description: "A supportive closing sentence." }
            },
            required: ["summary", "keyTerms", "questions", "encouragement"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}') as AnalysisResult;
      setResult(data);
    } catch (err) {
      console.error(err);
      setError("I couldn't analyze that content. Please try again or check your connection.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setImage(null);
    setInputText('');
    setResult(null);
    setError(null);
    setSelectedAnswers({});
    setShowResults({});
  };

  const handleAnswerSelect = (qIdx: number, option: string) => {
    if (showResults[qIdx]) return;
    setSelectedAnswers(prev => ({ ...prev, [qIdx]: option }));
  };

  const checkAnswer = (qIdx: number) => {
    setShowResults(prev => ({ ...prev, [qIdx]: true }));
  };

  const hasInput = (inputMode === 'upload' && image) || (inputMode === 'type' && inputText.trim().length > 10);

  return (
    <div className="min-h-screen font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-200/50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <BookOpen size={20} />
            </div>
            <h1 className="font-bold text-xl tracking-tight text-zinc-900">StudyBuddy AI</h1>
          </div>
          {(image || inputText || result) && (
            <button 
              onClick={reset}
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw size={14} />
              Start Over
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {!result && !isAnalyzing ? (
            <motion.div
              key="input-selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-3xl mx-auto"
            >
              <div className="text-center mb-10">
                <h2 className="text-4xl font-bold tracking-tight text-zinc-900 mb-4">
                  Turn your notes into <span className="gradient-text">superpowers</span>.
                </h2>
                <p className="text-lg text-zinc-600">
                  Upload a photo or type your notes. I'll summarize them, 
                  extract key terms, and quiz you to make sure you've got it down!
                </p>
              </div>

              {/* Input Mode Toggle */}
              <div className="flex justify-center mb-8">
                <div className="bg-zinc-100 p-1 rounded-xl flex gap-1">
                  <button
                    onClick={() => setInputMode('upload')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all",
                      inputMode === 'upload' ? "bg-white text-indigo-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                    )}
                  >
                    <ImageIcon size={16} />
                    Upload Image
                  </button>
                  <button
                    onClick={() => setInputMode('type')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all",
                      inputMode === 'type' ? "bg-white text-indigo-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                    )}
                  >
                    <TypeIcon size={16} />
                    Type Notes
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {inputMode === 'upload' ? (
                  <label className="group relative block cursor-pointer">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative bg-white border-2 border-dashed border-zinc-200 rounded-3xl p-12 flex flex-col items-center justify-center transition-all group-hover:border-indigo-300 group-hover:bg-indigo-50/30">
                      {image ? (
                        <div className="relative w-full max-w-md aspect-video rounded-xl overflow-hidden border border-zinc-200">
                          <img src={image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-white font-bold">Change Image</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform">
                            <Upload size={32} />
                          </div>
                          <p className="text-xl font-semibold text-zinc-900 mb-2">Click to upload or drag & drop</p>
                          <p className="text-zinc-500">PNG, JPG or JPEG (max. 10MB)</p>
                        </>
                      )}
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                      />
                    </div>
                  </label>
                ) : (
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-3xl blur opacity-10 group-focus-within:opacity-25 transition duration-500"></div>
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Paste your study notes here... (at least 10 characters)"
                      className="relative w-full h-64 p-6 bg-white border-2 border-zinc-200 rounded-3xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all resize-none text-lg leading-relaxed"
                    />
                  </div>
                )}

                <AnimatePresence>
                  {hasInput && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="flex justify-center"
                    >
                      <button
                        onClick={analyzeContent}
                        className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all flex items-center gap-3"
                      >
                        <BrainCircuit size={24} />
                        Analyze My Notes
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Sidebar: Content Preview */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-4 space-y-6"
              >
                <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-zinc-200 border border-zinc-200 bg-white">
                  {image ? (
                    <img src={image} alt="Study material" className="w-full h-auto" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-4 text-indigo-600">
                        <TypeIcon size={20} />
                        <span className="font-bold text-sm uppercase tracking-wider">Typed Notes</span>
                      </div>
                      <p className="text-zinc-500 text-sm line-clamp-[12] leading-relaxed italic">
                        "{inputText}"
                      </p>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex gap-3">
                    <div className="shrink-0 mt-0.5"><HelpCircle size={16} /></div>
                    <p>{error}</p>
                  </div>
                )}
                
                {result && (
                  <button
                    onClick={reset}
                    className="w-full py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={18} />
                    Try New Notes
                  </button>
                )}
              </motion.div>

              {/* Main Content: Results */}
              <div className="lg:col-span-8">
                <AnimatePresence mode="wait">
                  {isAnalyzing ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full flex flex-col items-center justify-center py-20 text-center"
                    >
                      <div className="relative mb-8">
                        <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full"></div>
                        <Loader2 className="w-16 h-16 text-indigo-600 animate-spin relative z-10" />
                      </div>
                      <h3 className="text-2xl font-bold text-zinc-900 mb-2">Reading your notes...</h3>
                      <p className="text-zinc-500 max-w-sm">
                        I'm identifying key concepts and preparing a custom quiz just for you. 
                        Hang tight, you're doing great!
                      </p>
                    </motion.div>
                  ) : result ? (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-12"
                    >
                      {/* Summary Section */}
                      <section>
                        <div className="flex items-center gap-2 mb-4">
                          <Sparkles className="text-amber-500" size={20} />
                          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">The Big Picture</h3>
                        </div>
                        <div className="p-8 bg-white border border-zinc-200 rounded-3xl shadow-sm">
                          <div className="text-2xl font-serif italic text-zinc-800 leading-relaxed">
                            <Markdown 
                              components={{
                                p: ({ children }) => <p className="mb-0">{children}</p>
                              }}
                            >
                              {"\"" + result.summary + "\""}
                            </Markdown>
                          </div>
                        </div>
                      </section>

                      {/* Key Terms Section */}
                      <section>
                        <div className="flex items-center gap-2 mb-6">
                          <BookOpen className="text-indigo-500" size={20} />
                          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Key Vocabulary</h3>
                        </div>
                        <div className="grid gap-4">
                          {result.keyTerms.map((item, idx) => (
                            <motion.div 
                              key={idx}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className="group p-5 bg-white border border-zinc-200 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all"
                            >
                              <h4 className="font-bold text-indigo-600 mb-1 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                {item.term}
                              </h4>
                              <div className="text-zinc-600 leading-relaxed">
                                <Markdown
                                  components={{
                                    p: ({ children }) => <p className="mb-0">{children}</p>,
                                    strong: ({ children }) => <strong className="font-bold text-zinc-900">{children}</strong>
                                  }}
                                >
                                  {item.definition}
                                </Markdown>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </section>

                      {/* Quiz Section */}
                      <section>
                        <div className="flex items-center gap-2 mb-6">
                          <BrainCircuit className="text-violet-500" size={20} />
                          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Knowledge Check</h3>
                        </div>
                        <div className="space-y-8">
                          {result.questions.map((q, qIdx) => (
                            <div key={qIdx} className="p-8 bg-zinc-50 border border-zinc-200 rounded-3xl">
                              <p className="text-lg font-bold text-zinc-900 mb-6">
                                {qIdx + 1}. {q.question}
                              </p>
                              <div className="grid gap-3">
                                {q.options.map((option, oIdx) => {
                                  const letter = String.fromCharCode(65 + oIdx);
                                  const isSelected = selectedAnswers[qIdx] === letter;
                                  const isCorrect = q.answer === letter;
                                  const showResult = showResults[qIdx];

                                  return (
                                    <button
                                      key={oIdx}
                                      onClick={() => handleAnswerSelect(qIdx, letter)}
                                      disabled={showResult}
                                      className={cn(
                                        "w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between group",
                                        !showResult && "bg-white border-zinc-200 hover:border-indigo-300 hover:bg-indigo-50/30",
                                        !showResult && isSelected && "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/10",
                                        showResult && isCorrect && "bg-emerald-50 border-emerald-200 text-emerald-700",
                                        showResult && isSelected && !isCorrect && "bg-red-50 border-red-200 text-red-700",
                                        showResult && !isSelected && !isCorrect && "bg-white border-zinc-200 opacity-50"
                                      )}
                                    >
                                      <div className="flex items-center gap-4">
                                        <div className={cn(
                                          "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0",
                                          !showResult && "bg-zinc-100 text-zinc-500 group-hover:bg-indigo-100 group-hover:text-indigo-600",
                                          !showResult && isSelected && "bg-indigo-600 text-white",
                                          showResult && isCorrect && "bg-emerald-600 text-white",
                                          showResult && isSelected && !isCorrect && "bg-red-600 text-white"
                                        )}>
                                          {letter}
                                        </div>
                                        <span>{option}</span>
                                      </div>
                                      {showResult && isCorrect && <CheckCircle2 size={18} />}
                                    </button>
                                  );
                                })}
                              </div>
                              
                              {!showResults[qIdx] && selectedAnswers[qIdx] && (
                                <motion.button
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  onClick={() => checkAnswer(qIdx)}
                                  className="mt-6 px-6 py-2 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors"
                                >
                                  Check Answer
                                </motion.button>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* Encouragement Footer */}
                      <footer className="pt-10 border-t border-zinc-200 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium mb-4">
                          <Sparkles size={14} />
                          Tutor's Note
                        </div>
                        <p className="text-xl font-serif italic text-zinc-600 max-w-2xl mx-auto">
                          "{result.encouragement}"
                        </p>
                      </footer>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
