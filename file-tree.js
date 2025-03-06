// # Basic usage with default settings (now shows 5 levels deep)
// node file-tree.js

// # Show all files regardless of depth
// node file-tree.js . --showAllFiles=true

// # Custom special folders with file sizes
// node file-tree.js . --specialFolders=src,config --showFileSize=true

// # Complete customization
// node file-tree.js . --maxDepth=10 --specialFolders=important,critical 

// --specialFoldersMaxDepth=30 --showFileSize=true --includeHidden=true --sortBy=size

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

/**
 * Generate a file tree with enhanced depth settings
 * - Regular folders: increased default depth
 * - Special folders: unlimited depth
 * - Added size reporting and more configuration options
 */
async function generateEnhancedFileTree(startPath = '.', options = {}) {
  // Enhanced default options
  const config = {
    maxDepth: 5,                    // Increased default max depth
    specialFolders: ['berryAdmin'], // Folders that should go deeper
    specialFoldersMaxDepth: 20,     // Greatly increased depth for special folders
    showAllFiles: false,            // Option to show all files regardless of depth
    showFileSize: true,             // Show file sizes
    sizeFormat: 'auto',             // 'auto', 'bytes', 'kb', 'mb'
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
      /^yarn-error\.log$/
    ],
    includeHidden: false,           // Option to include hidden files
    sortBy: 'type',                 // 'name', 'type', 'size'
    ...options
  };

  // Format file size
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

  // Function to check if a path should be excluded
  function shouldExclude(itemPath) {
    const basename = path.basename(itemPath);
    
    // Skip hidden files unless includeHidden is true
    if (!config.includeHidden && basename.startsWith('.')) {
      return true;
    }
    
    return config.excludePatterns.some(pattern => pattern.test(basename));
  }
  
  // Check if a path is or contains a special folder that should show all levels
  function isSpecialPath(itemPath, currentDepth = 0) {
    // If we're at the root level, special path detection doesn't apply yet
    if (currentDepth === 0) return false;
    
    const relativePath = path.relative(startPath, itemPath);
    const pathParts = relativePath.split(path.sep);
    
    // Check if any part of the path matches a special folder
    return config.specialFolders.some(specialFolder => 
      pathParts.some(part => part === specialFolder)
    );
  }
  
  // Sort items based on configuration
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
  
  // Function to recursively build the file tree
  async function buildTree(currentPath, currentDepth = 0, indent = '') {
    let result = '';
    
    // Check if we've reached max depth for this path
    const isSpecial = isSpecialPath(currentPath, currentDepth);
    const maxDepthForPath = isSpecial ? config.specialFoldersMaxDepth : config.maxDepth;
    
    // Show all files regardless of depth if showAllFiles is true
    if (currentDepth > maxDepthForPath && !config.showAllFiles) {
      return result + `${indent}... (more files/folders not shown - use showAllFiles option to see all)\n`;
    }
    
    try {
      const items = await readdir(currentPath);
      const filteredItems = items.filter(item => {
        const itemPath = path.join(currentPath, item);
        return !shouldExclude(itemPath);
      });
      
      // Get all stats concurrently for efficiency
      const itemPaths = filteredItems.map(item => path.join(currentPath, item));
      const statsPromises = itemPaths.map(itemPath => stat(itemPath).catch(() => null));
      const statsArray = await Promise.all(statsPromises);
      
      // Filter out any items where we couldn't get stats
      const validItems = [];
      const validPaths = [];
      const validStats = [];
      
      for (let i = 0; i < filteredItems.length; i++) {
        if (statsArray[i]) {
          validItems.push(filteredItems[i]);
          validPaths.push(itemPaths[i]);
          validStats.push(statsArray[i]);
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
        const isBerryAdmin = config.specialFolders.includes(name) || isSpecialPath(itemPath, currentDepth);
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
    `- Special folders (${config.specialFolders.join(', ')}): up to ${config.specialFoldersMaxDepth} levels deep 📌`,
  ];
  
  if (config.showAllFiles) {
    headerLines.push(`- Showing all files and folders (depth limits ignored)`);
  }
  
  if (config.showFileSize) {
    headerLines.push(`- File sizes shown in ${config.sizeFormat === 'auto' ? 'appropriate units' : config.sizeFormat}`);
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
    args.specialFolders = process.argv[3] ? process.argv[3].split(',') : ['berryAdmin'];
    args.maxDepth = process.argv[4] ? parseInt(process.argv[4]) : 5;
    args.showAllFiles = process.argv[5] === 'true';
  }
}

// Run the function with the parsed options
generateEnhancedFileTree(targetDir, args)
  .catch(err => {
    console.error('Error generating file tree:', err);
  });