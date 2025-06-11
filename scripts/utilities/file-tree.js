/**
 * Enhanced File Tree Generator
 * ===========================
 * 
 * DESCRIPTION:
 * This script generates a detailed file tree visualization of a directory structure
 * with advanced features like customizable depth levels, special folder handling,
 * file size reporting, and flexible filtering options.
 * 
 * USAGE:
 * Basic:
 *   node file-tree.js [directory]
 * 
 * Advanced (with named arguments):
 *   node file-tree.js [directory] --maxDepth=20 --showFileSize=true --sortBy=type
 * 
 * ARGUMENTS:
 *   [directory]                 : Target directory (default: current directory)
 *   --maxDepth=NUMBER           : Maximum directory depth to display (default: 20)
 *   --specialFolders=FOLDER,... : Folders to explore at unlimited depth (default: berryAdmin,BerryAdmin)
 *   --showAllFiles=BOOLEAN      : Show all files regardless of depth (default: false)
 *   --showFileSize=BOOLEAN      : Show file sizes (default: true)
 *   --sizeFormat=FORMAT         : Format for file sizes: 'auto', 'bytes', 'kb', 'mb' (default: auto)
 *   --includeHidden=BOOLEAN     : Include hidden files (default: false)
 *   --sortBy=TYPE               : Sort method: 'name', 'type', 'size' (default: type)
 *   --minSizeToIgnore=NUMBER    : Ignore files larger than this size in MB (default: 10)
 * 
 * EXAMPLES:
 *   # Show file tree of current directory (20 levels deep)
 *   node file-tree.js
 * 
 *   # Show file tree of specific directory with custom depth
 *   node file-tree.js /path/to/directory --maxDepth=15
 * 
 *   # Show all files including hidden ones
 *   node file-tree.js --includeHidden=true
 * 
 *   # Ignore files larger than 5MB
 *   node file-tree.js --minSizeToIgnore=5
 * 
 *   # Sort files by size (largest first)
 *   node file-tree.js --sortBy=size
 * 
 * NOTE:
 * The script automatically ignores node_modules, .git, and other common large directories.
 * Add your own exclude patterns as needed in the excludePatterns array.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

/**
 * Generate a file tree with enhanced depth settings and filtering options
 * @param {string} startPath - Starting directory path (default: current directory)
 * @param {Object} options - Configuration options
 * @returns {Promise<string>} - The generated file tree as a string
 */
async function generateEnhancedFileTree(startPath = '.', options = {}) {
  // Enhanced default options
  const config = {
    maxDepth: 20,                   // Increased default max depth to 20 levels
    specialFolders: ['berryAdmin', 'BerryAdmin'], // Special folders with case variations
    specialFoldersMaxDepth: 100,    // Greatly increased depth for special folders
    showAllFiles: false,            // Option to show all files regardless of depth
    showFileSize: true,             // Show file sizes
    sizeFormat: 'auto',             // 'auto', 'bytes', 'kb', 'mb'
    minSizeToIgnore: 10,            // Ignore files larger than this size in MB
    excludePatterns: [             
      /^node_modules$/,
      /^\.git$/,
      /^\.DS_Store$/,
      /^\.env(\..+)?$/,
      /^\.next$/,
      /^\.cache$/,
      /^dist$/,
      /^build$/,
      /^coverage$/,
      /^npm-debug\.log$/,
      /^yarn-debug\.log$/,
      /^yarn-error\.log$/,
      /example.*\.(zip|tar|gz|rar)$/i, // Ignore example archive files
      /sample_.*\.(json|csv|xml)$/i,   // Ignore sample data files
      /demo.*data.*\.(json|csv|xml)$/i // Ignore demo data files
    ],
    includeHidden: false,           // Option to include hidden files
    sortBy: 'type',                 // 'name', 'type', 'size'
    ...options
  };

  /**
   * Format file size according to configuration
   * @param {number} bytes - Size in bytes
   * @returns {string} - Formatted size string
   */
  function formatSize(bytes) {
    if (!config.showFileSize) return '';
    
    if (config.sizeFormat === 'bytes' || bytes < 1024) {
      return ` (${bytes} B)`;
    } else if (config.sizeFormat === 'kb' || bytes < 1024 * 1024) {
      return ` (${(bytes / 1024).toFixed(1)} KB)`;
    } else if (config.sizeFormat === 'mb' || config.sizeFormat === 'auto') {
      return ` (${(bytes / (1024 * 1024)).toFixed(1)} MB)`;
    }
  }

  /**
   * Check if a file or directory should be excluded based on patterns or size
   * @param {string} itemPath - Path to check
   * @param {fs.Stats} [itemStats] - File stats if available
   * @returns {boolean} - True if the item should be excluded
   */
  async function shouldExclude(itemPath, itemStats = null) {
    const basename = path.basename(itemPath);
    
    // Skip hidden files unless includeHidden is true
    if (!config.includeHidden && basename.startsWith('.')) {
      return true;
    }
    
    // Check if name matches any exclude pattern
    if (config.excludePatterns.some(pattern => pattern.test(basename))) {
      return true;
    }
    
    // Check file size if we have stats or can get them
    if (config.minSizeToIgnore > 0) {
      try {
        const stats = itemStats || await stat(itemPath);
        if (!stats.isDirectory()) {
          const sizeInMB = stats.size / (1024 * 1024);
          if (sizeInMB > config.minSizeToIgnore) {
            return true; // Exclude large files
          }
        }
      } catch (error) {
        // If we can't access stats, don't exclude based on size
      }
    }
    
    return false;
  }
  
  /**
   * Check if a path is or contains a special folder that should show all levels
   * @param {string} itemPath - Path to check
   * @returns {boolean} - True if the path is special
   */
  function isSpecialPath(itemPath) {
    const relativePath = path.relative(startPath, itemPath);
    const pathParts = relativePath.split(path.sep);
    
    // Check if any part of the path matches a special folder (case insensitive)
    return config.specialFolders.some(specialFolder => 
      pathParts.some(part => part.toLowerCase() === specialFolder.toLowerCase())
    );
  }
  
  /**
   * Sort items based on configuration
   * @param {string[]} items - File/directory names
   * @param {string[]} itemPaths - Full paths
   * @param {fs.Stats[]} statsArray - Stats objects
   * @returns {Array<Object>} - Sorted array of objects with name, path, and stats
   */
  function sortItems(items, itemPaths, statsArray) {
    return items.map((item, index) => ({ 
      name: item, 
      path: itemPaths[index], 
      stats: statsArray[index] 
    }))
    .sort((a, b) => {
      if (config.sortBy === 'type') {
        // Directories first, then files
        if (a.stats.isDirectory() && !b.stats.isDirectory()) return -1;
        if (!a.stats.isDirectory() && b.stats.isDirectory()) return 1;
      }
      
      if (config.sortBy === 'size' && !a.stats.isDirectory() && !b.stats.isDirectory()) {
        return b.stats.size - a.stats.size;
      }
      
      // Default: sort by name (case insensitive)
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  }
  
  /**
   * Recursively build the file tree
   * @param {string} currentPath - Current directory path
   * @param {number} currentDepth - Current depth level
   * @param {string} indent - Current indentation string
   * @returns {Promise<string>} - Generated tree for the current path
   */
  async function buildTree(currentPath, currentDepth = 0, indent = '') {
    let result = '';
    
    // Check if we've reached max depth for this path
    const isSpecial = isSpecialPath(currentPath);
    
    // If we're in a special folder or its descendants, use the special folder max depth
    const maxDepthForPath = isSpecial ? config.specialFoldersMaxDepth : config.maxDepth;
    
    // Show all files regardless of depth if showAllFiles is true or if we're in a special folder
    if (currentDepth > maxDepthForPath && !config.showAllFiles && !isSpecial) {
      return result + `${indent}... (more files/folders not shown - use --showAllFiles=true to see all)\n`;
    }
    
    try {
      const items = await readdir(currentPath);
      
      // Get all stats concurrently for efficiency
      const itemPaths = items.map(item => path.join(currentPath, item));
      const statsPromises = itemPaths.map(itemPath => stat(itemPath).catch(() => null));
      const statsArray = await Promise.all(statsPromises);
      
      // Filter out any items where we couldn't get stats or should be excluded
      const validItems = [];
      const validPaths = [];
      const validStats = [];
      
      for (let i = 0; i < items.length; i++) {
        if (statsArray[i]) {
          const shouldExcludeItem = await shouldExclude(itemPaths[i], statsArray[i]);
          if (!shouldExcludeItem) {
            validItems.push(items[i]);
            validPaths.push(itemPaths[i]);
            validStats.push(statsArray[i]);
          }
        }
      }
      
      // Sort items based on configuration
      const sortedItems = sortItems(validItems, validPaths, validStats);
      
      for (let i = 0; i < sortedItems.length; i++) {
        const { name, path: itemPath, stats } = sortedItems[i];
        const isLast = i === sortedItems.length - 1;
        const prefix = indent + (isLast ? '└── ' : '├── ');
        const nextIndent = indent + (isLast ? '    ' : '│   ');
        
        // Special case: if this is a special folder or inside one, mark it
        const isBerryAdmin = config.specialFolders.some(folder => 
          folder.toLowerCase() === name.toLowerCase()
        ) || isSpecialPath(itemPath);
        
        const marker = isBerryAdmin ? ' 📌' : '';
        const sizeInfo = stats.isDirectory() ? '' : formatSize(stats.size);
        
        result += `${prefix}${name}${stats.isDirectory() ? '/' : ''}${marker}${sizeInfo}\n`;
        
        if (stats.isDirectory()) {
          const subtree = await buildTree(
            itemPath, 
            currentDepth + 1, 
            nextIndent
          );
          result += subtree;
        }
      }
      
      return result;
    } catch (err) {
      console.error(`Error accessing ${currentPath}: ${err.message}`);
      return `${indent}Error accessing directory: ${err.message}\n`;
    }
  }
  
  // Generate and print tree header
  const rootDir = path.basename(path.resolve(startPath));
  const headerLines = [
    `File tree for ${rootDir}:`,
    `- Regular folders: up to ${config.maxDepth} levels deep`,
    `- Special folders (${config.specialFolders.join(', ')}): showing all files and folders 📌`,
  ];
  
  if (config.showAllFiles) {
    headerLines.push(`- Showing all files and folders (depth limits ignored)`);
  }
  
  if (config.showFileSize) {
    headerLines.push(`- File sizes shown in ${config.sizeFormat === 'auto' ? 'appropriate units' : config.sizeFormat}`);
  }
  
  if (config.minSizeToIgnore > 0) {
    headerLines.push(`- Ignoring files larger than ${config.minSizeToIgnore} MB`);
  }
  
  headerLines.forEach(line => console.log(line));
  console.log(`${rootDir}/`);
  
  const tree = await buildTree(startPath);
  console.log(tree);
  
  return tree;
}

// Check if a directory was provided as a command-line argument
const targetDir = process.argv[2] || '.';

// Parse additional arguments
let args = {};

// Support for both positional and named arguments
if (process.argv.length > 3) {
  // Check if using named arguments (--key=value format)
  const namedArgs = process.argv.slice(3).filter(arg => arg.startsWith('--'));
  
  if (namedArgs.length > 0) {
    // Parse named arguments
    namedArgs.forEach(arg => {
      const [key, value] = arg.slice(2).split('=');
      if (key && value !== undefined) {
        // Parse special values
        if (value === 'true') args[key] = true;
        else if (value === 'false') args[key] = false;
        else if (!isNaN(Number(value))) args[key] = Number(value);
        else if (value.includes(',')) args[key] = value.split(',');
        else args[key] = value;
      }
    });
  } else {
    // Use positional arguments for backward compatibility
    args.specialFolders = process.argv[3] ? process.argv[3].split(',') : ['berryAdmin', 'BerryAdmin'];
    args.maxDepth = process.argv[4] ? parseInt(process.argv[4]) : 20; // Default is now 20
    args.showAllFiles = process.argv[5] === 'true';
  }
}

// Ensure berryAdmin is in the special folders list (with both case variations)
if (!args.specialFolders) {
  args.specialFolders = ['berryAdmin', 'BerryAdmin'];
} else if (Array.isArray(args.specialFolders)) {
  if (!args.specialFolders.some(folder => folder.toLowerCase() === 'berryadmin')) {
    args.specialFolders.push('berryAdmin', 'BerryAdmin');
  }
} else if (typeof args.specialFolders === 'string' && args.specialFolders.toLowerCase() !== 'berryadmin') {
  args.specialFolders = [args.specialFolders, 'berryAdmin', 'BerryAdmin'];
}

// Run the function with the parsed options
generateEnhancedFileTree(targetDir, args)
  .catch(err => {
    console.error('Error generating file tree:', err);
  });