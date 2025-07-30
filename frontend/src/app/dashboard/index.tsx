"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";

interface Translation {
  _id: string;
  originalText: string;
  originalLanguage: string;
  translatedText: string;
  tone: string;
  createdAt: Date;
  isFavorite: boolean;
  tags: string[];
}

interface DashboardStats {
  totalTranslations: number;
  todayTranslations: number;
  favoriteTranslations: number;
  mostUsedTone: string;
  languagesUsed: number;
  charactersTranslated: number;
}

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [selectedTone, setSelectedTone] = useState("natural");
  const [loading, setLoading] = useState(false);
  const [currentTranslation, setCurrentTranslation] =
    useState<Translation | null>(null);
  const [recentTranslations, setRecentTranslations] = useState<Translation[]>(
    []
  );
  const [stats, setStats] = useState<DashboardStats>({
    totalTranslations: 156,
    todayTranslations: 8,
    favoriteTranslations: 23,
    mostUsedTone: "natural",
    languagesUsed: 12,
    charactersTranslated: 45680,
  });
  const [error, setError] = useState<string | null>(null);

  const [user] = useState({
    username: "John Doe",
    email: "john@example.com",
    avatar: "",
  });

  const toneOptions = [
    {
      value: "natural",
      label: "自然风格",
      description: "自然流畅的翻译",
      icon: "🌿",
    },
    {
      value: "gentle",
      label: "温和风格",
      description: "温柔体贴的语调",
      icon: "🌸",
    },
    {
      value: "cute",
      label: "可爱风格",
      description: "活泼可爱的表达",
      icon: "🐱",
    },
    {
      value: "depressed",
      label: "忧郁风格",
      description: "沉重忧郁的语调",
      icon: "🌧️",
    },
    {
      value: "angry",
      label: "愤怒风格",
      description: "激烈愤怒的表达",
      icon: "🔥",
    },
  ];

  // Mock recent translations
  useEffect(() => {
    setRecentTranslations([
      {
        _id: "1",
        originalText: "こんにちは、元気ですか？",
        originalLanguage: "Japanese",
        translatedText: "Hello, how are you?",
        tone: "natural",
        createdAt: new Date(Date.now() - 1000 * 60 * 30),
        isFavorite: false,
        tags: ["greeting"],
      },
      {
        _id: "2",
        originalText: "今日はとても忙しい一日でした。",
        originalLanguage: "Japanese",
        translatedText: "Today was a very busy day.",
        tone: "gentle",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        isFavorite: true,
        tags: ["daily", "work"],
      },
      {
        _id: "3",
        originalText: "ありがとうございます！",
        originalLanguage: "Japanese",
        translatedText: "Thank you so much!",
        tone: "cute",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
        isFavorite: false,
        tags: ["thanks"],
      },
    ]);
  }, []);

  const handleTranslate = async () => {
    if (!inputText.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Mock API call - replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const mockTranslation: Translation = {
        _id: Date.now().toString(),
        originalText: inputText,
        originalLanguage: "Japanese",
        translatedText: `Translated: ${inputText} (${selectedTone} tone)`,
        tone: selectedTone,
        createdAt: new Date(),
        isFavorite: false,
        tags: [],
      };

      setCurrentTranslation(mockTranslation);
      setRecentTranslations((prev) => [mockTranslation, ...prev.slice(0, 4)]);
      setStats((prev) => ({
        ...prev,
        totalTranslations: prev.totalTranslations + 1,
        todayTranslations: prev.todayTranslations + 1,
        charactersTranslated: prev.charactersTranslated + inputText.length,
      }));
    } catch {
      setError("Translation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const toggleFavorite = (id: string) => {
    setRecentTranslations((prev) =>
      prev.map((translation) =>
        translation._id === id
          ? { ...translation, isFavorite: !translation.isFavorite }
          : translation
      )
    );

    if (currentTranslation && currentTranslation._id === id) {
      setCurrentTranslation((prev) =>
        prev ? { ...prev, isFavorite: !prev.isFavorite } : null
      );
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const handleLogout = () => {
    // Handle logout logic
    console.log("Logout clicked");
  };

  return (
    <div className='min-h-screen bg-background'>
      {/* Header */}
      <Header
        onMenuClick={() => setSidebarOpen(true)}
        user={user}
        onLogout={handleLogout}
      />

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className='md:ml-64'>
        <div className='container mx-auto px-4 py-6 space-y-6'>
          {/* Welcome Section */}
          <div className='flex flex-col gap-2'>
            <h1 className='text-3xl font-bold tracking-tight'>Welcome back!</h1>
            <p className='text-muted-foreground'>
              Transform your text with AI-powered translation that understands
              context and tone.
            </p>
          </div>

          {/* Stats Cards */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
            <div className='bg-card border rounded-lg p-4'>
              <div className='flex items-center justify-between'>
                <h3 className='text-sm font-medium'>Total Translations</h3>
                <span className='text-2xl font-bold'>
                  {stats.totalTranslations}
                </span>
              </div>
              <p className='text-xs text-muted-foreground'>
                +{stats.todayTranslations} today
              </p>
            </div>

            <div className='bg-card border rounded-lg p-4'>
              <div className='flex items-center justify-between'>
                <h3 className='text-sm font-medium'>Favorites</h3>
                <span className='text-2xl font-bold'>
                  {stats.favoriteTranslations}
                </span>
              </div>
              <p className='text-xs text-muted-foreground'>
                {Math.round(
                  (stats.favoriteTranslations / stats.totalTranslations) * 100
                )}
                % of total
              </p>
            </div>

            <div className='bg-card border rounded-lg p-4'>
              <div className='flex items-center justify-between'>
                <h3 className='text-sm font-medium'>Languages</h3>
                <span className='text-2xl font-bold'>
                  {stats.languagesUsed}
                </span>
              </div>
              <p className='text-xs text-muted-foreground'>
                Most used: {stats.mostUsedTone}
              </p>
            </div>

            <div className='bg-card border rounded-lg p-4'>
              <div className='flex items-center justify-between'>
                <h3 className='text-sm font-medium'>Characters</h3>
                <span className='text-2xl font-bold'>
                  {stats.charactersTranslated.toLocaleString()}
                </span>
              </div>
              <p className='text-xs text-muted-foreground'>Translated total</p>
            </div>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
            {/* Translation Form */}
            <div className='lg:col-span-2 space-y-6'>
              <div className='bg-card border rounded-lg p-6'>
                <h2 className='text-lg font-semibold mb-4'>AI Translation</h2>
                <p className='text-muted-foreground mb-4'>
                  Enter your text below and select a tone for personalized
                  translation
                </p>

                {error && (
                  <div className='bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-4'>
                    {error}
                  </div>
                )}

                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <label className='text-sm font-medium'>Original Text</label>
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder='输入您想要翻译的文本...'
                      className='w-full min-h-[120px] p-3 border rounded-lg resize-none'
                      maxLength={1000}
                    />
                    <div className='flex justify-between text-xs text-muted-foreground'>
                      <span>Detected: Japanese</span>
                      <span>{inputText.length}/1000</span>
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <label className='text-sm font-medium'>
                      Translation Tone
                    </label>
                    <select
                      value={selectedTone}
                      onChange={(e) => setSelectedTone(e.target.value)}
                      className='w-full p-3 border rounded-lg'
                      aria-label='Select translation tone'
                    >
                      {toneOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.icon} {option.label} - {option.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleTranslate}
                    disabled={loading || !inputText.trim()}
                    className='w-full bg-primary text-primary-foreground px-4 py-3 rounded-lg font-medium disabled:opacity-50'
                  >
                    {loading ? "Translating..." : "Translate Text"}
                  </button>

                  {loading && (
                    <div className='space-y-2'>
                      <div className='flex justify-between text-sm text-muted-foreground'>
                        <span>Processing...</span>
                        <span>AI is working</span>
                      </div>
                      <div className='w-full bg-muted rounded-full h-2'>
                        <div
                          className='bg-primary h-2 rounded-full'
                          style={{ width: "65%" }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Translation Result */}
              {currentTranslation && (
                <div className='bg-card border rounded-lg p-6'>
                  <div className='flex items-center justify-between mb-4'>
                    <h2 className='text-lg font-semibold'>
                      Translation Result
                    </h2>
                    <span className='px-2 py-1 bg-secondary text-secondary-foreground rounded text-sm'>
                      {
                        toneOptions.find(
                          (t) => t.value === currentTranslation.tone
                        )?.label
                      }
                    </span>
                  </div>

                  <div className='space-y-4'>
                    <div className='space-y-3'>
                      <div className='p-4 bg-muted rounded-lg'>
                        <div className='text-sm text-muted-foreground mb-1'>
                          Original ({currentTranslation.originalLanguage})
                        </div>
                        <div className='text-base'>
                          {currentTranslation.originalText}
                        </div>
                      </div>
                      <div className='p-4 bg-primary/5 border border-primary/20 rounded-lg'>
                        <div className='text-sm text-muted-foreground mb-1'>
                          Translation (English)
                        </div>
                        <div className='text-base font-medium'>
                          {currentTranslation.translatedText}
                        </div>
                      </div>
                    </div>

                    <div className='flex items-center justify-between pt-2'>
                      <div className='flex items-center gap-2'>
                        <button
                          onClick={() =>
                            handleCopy(currentTranslation.translatedText)
                          }
                          className='px-3 py-1 text-sm border rounded hover:bg-muted'
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => toggleFavorite(currentTranslation._id)}
                          className='px-3 py-1 text-sm border rounded hover:bg-muted'
                        >
                          {currentTranslation.isFavorite
                            ? "Favorited"
                            : "Favorite"}
                        </button>
                        <button className='px-3 py-1 text-sm border rounded hover:bg-muted'>
                          Share
                        </button>
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {formatTimeAgo(currentTranslation.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className='space-y-6'>
              {/* Quick Actions */}
              <div className='bg-card border rounded-lg p-6'>
                <h3 className='text-lg font-semibold mb-4'>Quick Actions</h3>
                <div className='space-y-2'>
                  <button className='w-full text-left px-3 py-2 border rounded hover:bg-muted'>
                    View History
                  </button>
                  <button className='w-full text-left px-3 py-2 border rounded hover:bg-muted'>
                    My Favorites
                  </button>
                  <button className='w-full text-left px-3 py-2 border rounded hover:bg-muted'>
                    Export Data
                  </button>
                </div>
              </div>

              {/* Recent Translations */}
              <div className='bg-card border rounded-lg p-6'>
                <h3 className='text-lg font-semibold mb-4'>
                  Recent Translations
                </h3>
                <div className='space-y-3'>
                  {recentTranslations.length === 0 ? (
                    <p className='text-sm text-muted-foreground text-center py-4'>
                      No recent translations yet
                    </p>
                  ) : (
                    recentTranslations.map((translation, index) => (
                      <div key={translation._id}>
                        <div className='space-y-2'>
                          <div className='flex items-start justify-between'>
                            <div className='space-y-1 flex-1 min-w-0'>
                              <p className='text-sm font-medium truncate'>
                                {translation.originalText}
                              </p>
                              <p className='text-xs text-muted-foreground truncate'>
                                {translation.translatedText}
                              </p>
                              <div className='flex items-center gap-2'>
                                <span className='text-xs px-2 py-1 border rounded'>
                                  {
                                    toneOptions.find(
                                      (t) => t.value === translation.tone
                                    )?.icon
                                  }
                                  {
                                    toneOptions.find(
                                      (t) => t.value === translation.tone
                                    )?.label
                                  }
                                </span>
                                <span className='text-xs text-muted-foreground'>
                                  {formatTimeAgo(translation.createdAt)}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => toggleFavorite(translation._id)}
                              className='p-1 hover:bg-muted rounded'
                            >
                              <span
                                className={
                                  translation.isFavorite ? "text-red-500" : ""
                                }
                              >
                                ♥
                              </span>
                            </button>
                          </div>
                        </div>
                        {index < recentTranslations.length - 1 && (
                          <hr className='mt-3' />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Usage Tips */}
              <div className='bg-card border rounded-lg p-6'>
                <h3 className='text-lg font-semibold mb-4'>💡 Pro Tips</h3>
                <div className='space-y-2 text-sm'>
                  <div className='flex items-start gap-2'>
                    <div className='w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0' />
                    <p>Try different tones to match your communication style</p>
                  </div>
                  <div className='flex items-start gap-2'>
                    <div className='w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0' />
                    <p>Save frequently used translations as favorites</p>
                  </div>
                  <div className='flex items-start gap-2'>
                    <div className='w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0' />
                    <p>Use context clues for more accurate translations</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
