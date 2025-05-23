/**
 * UserDashboard.tsx
 * Instagram-Style Social User Dashboard with Dark/Light Theme
 * Built with Tailwind CSS - SwanStudios branded
 * FULLY STANDALONE - NO ADMIN/TRAINER ELEMENTS
 */
import React, { useState, useEffect } from 'react';
import { 
  User, 
  Settings, 
  Heart,
  MessageCircle,
  PlusCircle,
  Sun,
  Moon,
  Bell,
  Camera,
  Edit3,
  Users,
  Target,
  Activity,
  Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Theme context
interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextType>({
  isDark: true,
  toggleTheme: () => {}
});

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [isDark, setIsDark] = useState(true);
  const [activeTab, setActiveTab] = useState('about');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  const toggleTheme = () => {
    setIsDark(!isDark);
  };
  
  // Theme classes
  const themeClasses = {
    bg: isDark ? 'bg-gray-900' : 'bg-gray-50',
    cardBg: isDark ? 'bg-gray-800' : 'bg-white',
    text: isDark ? 'text-white' : 'text-gray-900',
    textSecondary: isDark ? 'text-gray-300' : 'text-gray-600',
    border: isDark ? 'border-gray-700' : 'border-gray-200',
    hover: isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
  };
  
  const stories = [
    { id: 1, username: 'My Story', image: '/api/placeholder/100/100', isOwn: true },
    { id: 2, username: 'workout_buddy', image: '/api/placeholder/100/100' },
    { id: 3, username: 'fitness_coach', image: '/api/placeholder/100/100' },
    { id: 4, username: 'gym_friends', image: '/api/placeholder/100/100' },
  ];
  
  const getDisplayName = () => {
    // First priority: firstName + lastName combination
    if (user?.firstName && user?.lastName && 
        user.firstName.trim() !== '' && user.lastName.trim() !== '') {
      return `${user.firstName.trim()} ${user.lastName.trim()}`;
    }
    
    // Second priority: Non-email username
    if (user?.username && user.username !== user?.email && 
        user.username.trim() !== '' && !user.username.includes('@')) {
      return user.username.trim();
    }
    
    // Third priority: Extract from email
    if (user?.email && user.email.includes('@')) {
      return user.email.split('@')[0];
    }
    
    // Fallback
    return user?.username || 'User';
  };
  
  const getUsernameForDisplay = () => {
    // If username exists and is not an email, use it
    if (user?.username && user.username !== user?.email && !user.username.includes('@')) {
      return user.username.toLowerCase();
    }
    
    // Extract from email if available
    if (user?.email && user.email.includes('@')) {
      return user.email.split('@')[0].toLowerCase();
    }
    
    // Fallback to username or default
    return (user?.username || 'user').toLowerCase();
  };
  
  if (isLoading) {
    return (
      <div className={`min-h-screen ${themeClasses.bg} ${themeClasses.text}`}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin">
            <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <div className={`min-h-screen ${themeClasses.bg} transition-colors duration-300`}>
        {/* Header */}
        <div className={`${themeClasses.cardBg} border-b ${themeClasses.border} sticky top-0 z-50`}>
          <div className="max-w-screen-xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent">
                  SwanStudios
                </h1>
              </div>
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-full ${themeClasses.hover} transition-colors`}
                >
                  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <button className={`p-2 rounded-full ${themeClasses.hover} transition-colors`}>
                  <PlusCircle className="w-5 h-5" />
                </button>
                <button className={`p-2 rounded-full ${themeClasses.hover} transition-colors`}>
                  <Bell className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="max-w-none px-0 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Sidebar - Profile Info */}
            <div className="lg:col-span-1">
              <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-lg p-6`}>
                <div className="flex flex-col items-center">
                  {/* Profile Picture */}
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-r from-cyan-400 to-purple-600 p-[2px]">
                      <div className={`w-full h-full rounded-full ${themeClasses.cardBg} flex items-center justify-center`}>
                        {user?.photo ? (
                          <img src={user.photo} alt="Profile" className="w-28 h-28 rounded-full object-cover" />
                        ) : (
                          <span className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent">
                            {getDisplayName().split(' ').map(n => n[0]).join('')}
                          </span>
                        )}
                      </div>
                    </div>
                    <button className="absolute bottom-2 right-2 bg-cyan-400 rounded-full p-2 hover:bg-cyan-500 transition-colors">
                      <Camera className="w-4 h-4 text-gray-900" />
                    </button>
                  </div>
                  
                  {/* User Info */}
                  <h2 className={`text-xl font-semibold mt-4 ${themeClasses.text}`}>
                    {getDisplayName()}
                  </h2>
                  <p className={`${themeClasses.textSecondary} text-sm`}>
                    @{getUsernameForDisplay()}
                  </p>
                  
                  {/* User Role Badge */}
                  <div className="mt-2">
                    <span className="px-3 py-1 bg-gradient-to-r from-cyan-400 to-purple-600 text-white text-xs font-medium rounded-full">
                      {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || 'User'}
                    </span>
                  </div>
                  
                  {/* Stats */}
                  <div className="flex space-x-6 mt-6">
                    <div className="text-center">
                      <div className={`text-xl font-semibold ${themeClasses.text}`}>42</div>
                      <div className={`text-sm ${themeClasses.textSecondary}`}>Posts</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-xl font-semibold ${themeClasses.text}`}>1.2K</div>
                      <div className={`text-sm ${themeClasses.textSecondary}`}>Followers</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-xl font-semibold ${themeClasses.text}`}>845</div>
                      <div className={`text-sm ${themeClasses.textSecondary}`}>Following</div>
                    </div>
                  </div>
                  
                  {/* Bio */}
                  <p className={`text-center mt-4 ${themeClasses.textSecondary} text-sm`}>
                    🏋️ Fitness enthusiast • 💪 SwanStudios member • 🌟 On a journey to better health
                  </p>
                  
                  {/* Action Buttons */}
                  <div className="flex space-x-3 mt-6 w-full">
                    <button className="flex-1 bg-gradient-to-r from-cyan-400 to-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity">
                      <Edit3 className="w-4 h-4 inline mr-2" />
                      Edit Profile
                    </button>
                    <button className={`p-2 border ${themeClasses.border} rounded-lg ${themeClasses.hover} transition-colors`}>
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Fitness Stats */}
              <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-lg p-6 mt-6`}>
                <h3 className={`text-lg font-semibold mb-4 ${themeClasses.text}`}>Fitness Journey</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg">
                        <Activity className="w-5 h-5 text-cyan-500" />
                      </div>
                      <span className={themeClasses.text}>Workouts</span>
                    </div>
                    <span className={`font-semibold ${themeClasses.text}`}>127</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                        <Zap className="w-5 h-5 text-purple-500" />
                      </div>
                      <span className={themeClasses.text}>Streak</span>
                    </div>
                    <span className={`font-semibold ${themeClasses.text}`}>15 days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                        <Target className="w-5 h-5 text-green-500" />
                      </div>
                      <span className={themeClasses.text}>Goals</span>
                    </div>
                    <span className={`font-semibold ${themeClasses.text}`}>3/5</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Stories */}
              <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-lg p-4 mb-6`}>
                <div className="flex space-x-4 overflow-x-auto">
                  {stories.map((story) => (
                    <div key={story.id} className="flex-shrink-0 text-center">
                      <div className={`w-16 h-16 rounded-full p-[2px] ${story.isOwn ? 'bg-gradient-to-r from-cyan-400 to-purple-600' : 'bg-gray-300'}`}>
                        <img 
                          src={story.image} 
                          alt={story.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      </div>
                      <p className={`text-xs mt-1 ${themeClasses.textSecondary} truncate w-16`}>
                        {story.username}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Profile Navigation Tabs */}
              <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-lg`}>
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <nav className="flex space-x-8 px-6">
                    {[
                      { id: 'about', label: 'About', icon: User },
                      { id: 'activity', label: 'Activity', icon: Activity },
                      { id: 'friends', label: 'Friends', icon: Users },
                      { id: 'photos', label: 'Photos', icon: Camera },
                      { id: 'settings', label: 'Settings', icon: Settings },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                            activeTab === tab.id
                              ? 'border-cyan-400 text-cyan-400'
                              : `border-transparent ${themeClasses.textSecondary} hover:text-gray-500`
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>
                
                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === 'about' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className={`text-lg font-semibold mb-3 ${themeClasses.text}`}>About Me</h3>
                        <p className={`${themeClasses.textSecondary} mb-4`}>
                          Welcome to my SwanStudios profile! I'm passionate about fitness and wellness.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className={`p-4 border ${themeClasses.border} rounded-lg`}>
                            <h4 className={`font-semibold mb-2 ${themeClasses.text}`}>Personal Info</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className={themeClasses.textSecondary}>Joined:</span>
                                <span className={themeClasses.text}>March 2024</span>
                              </div>
                              <div className="flex justify-between">
                                <span className={themeClasses.textSecondary}>Location:</span>
                                <span className={themeClasses.text}>Los Angeles, CA</span>
                              </div>
                              <div className="flex justify-between">
                                <span className={themeClasses.textSecondary}>Member Type:</span>
                                <span className={themeClasses.text}>{user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}</span>
                              </div>
                            </div>
                          </div>
                          <div className={`p-4 border ${themeClasses.border} rounded-lg`}>
                            <h4 className={`font-semibold mb-2 ${themeClasses.text}`}>Fitness Goals</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className={themeClasses.textSecondary}>Primary Goal:</span>
                                <span className={themeClasses.text}>Build Muscle</span>
                              </div>
                              <div className="flex justify-between">
                                <span className={themeClasses.textSecondary}>Experience:</span>
                                <span className={themeClasses.text}>Intermediate</span>
                              </div>
                              <div className="flex justify-between">
                                <span className={themeClasses.textSecondary}>Favorite Activity:</span>
                                <span className={themeClasses.text}>Weight Training</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {activeTab === 'activity' && (
                    <div>
                      <h3 className={`text-lg font-semibold mb-4 ${themeClasses.text}`}>Recent Activity</h3>
                      <div className="space-y-4">
                        {[
                          { action: 'Completed a workout', time: '2 hours ago', icon: '💪' },
                          { action: 'Shared a post about nutrition', time: '1 day ago', icon: '📝' },
                          { action: 'Achieved "Week Warrior" badge', time: '3 days ago', icon: '🏆' },
                          { action: 'Joined SwanStudios community', time: '1 week ago', icon: '🎉' }
                        ].map((activity, index) => (
                          <div key={index} className={`flex items-center space-x-3 p-3 border ${themeClasses.border} rounded-lg`}>
                            <span className="text-2xl">{activity.icon}</span>
                            <div className="flex-1">
                              <p className={`${themeClasses.text} font-medium`}>{activity.action}</p>
                              <p className={`text-sm ${themeClasses.textSecondary}`}>{activity.time}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {activeTab === 'friends' && (
                    <div>
                      <h3 className={`text-lg font-semibold mb-4 ${themeClasses.text}`}>Friends & Connections</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[
                          { name: 'Alex Trainer', role: 'Personal Trainer', image: '/api/placeholder/100/100' },
                          { name: 'Sarah Fitness', role: 'Workout Buddy', image: '/api/placeholder/100/100' },
                          { name: 'Mike Strong', role: 'Gym Partner', image: '/api/placeholder/100/100' },
                          { name: 'Lisa Health', role: 'Nutrition Coach', image: '/api/placeholder/100/100' }
                        ].map((friend, index) => (
                          <div key={index} className={`p-3 border ${themeClasses.border} rounded-lg text-center`}>
                            <img 
                              src={friend.image} 
                              alt={friend.name}
                              className="w-16 h-16 rounded-full mx-auto mb-2"
                            />
                            <h4 className={`font-medium text-sm ${themeClasses.text}`}>{friend.name}</h4>
                            <p className={`text-xs ${themeClasses.textSecondary}`}>{friend.role}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {activeTab === 'photos' && (
                    <div>
                      <h3 className={`text-lg font-semibold mb-4 ${themeClasses.text}`}>Photo Gallery</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {Array.from({ length: 9 }, (_, i) => (
                          <div key={i} className="aspect-square">
                            <img 
                              src={`/api/placeholder/300/300`}
                              alt={`Photo ${i + 1}`}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="text-center mt-6">
                        <button className="bg-gradient-to-r from-cyan-400 to-purple-600 text-white py-2 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity">
                          Upload Photos
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {activeTab === 'settings' && (
                    <div>
                      <h3 className={`text-lg font-semibold mb-4 ${themeClasses.text}`}>Profile Settings</h3>
                      <div className="space-y-6">
                        <div className={`p-4 border ${themeClasses.border} rounded-lg`}>
                          <h4 className={`font-semibold mb-3 ${themeClasses.text}`}>Privacy Settings</h4>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className={themeClasses.text}>Profile Visibility</span>
                              <select className={`bg-gray-100 dark:bg-gray-700 border ${themeClasses.border} rounded px-3 py-1`}>
                                <option>Public</option>
                                <option>Friends Only</option>
                                <option>Private</option>
                              </select>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={themeClasses.text}>Activity Sharing</span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" defaultChecked className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 dark:peer-focus:ring-cyan-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-cyan-600"></div>
                              </label>
                            </div>
                          </div>
                        </div>
                        
                        <div className={`p-4 border ${themeClasses.border} rounded-lg`}>
                          <h4 className={`font-semibold mb-3 ${themeClasses.text}`}>Notification Preferences</h4>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className={themeClasses.text}>Email Notifications</span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" defaultChecked className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 dark:peer-focus:ring-cyan-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-cyan-600"></div>
                              </label>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={themeClasses.text}>Push Notifications</span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 dark:peer-focus:ring-cyan-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-cyan-600"></div>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ThemeContext.Provider>
  );
};

export default UserDashboard;