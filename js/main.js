// DOM Elements
const elements = {
    tabs: document.querySelectorAll('.tab'),
    sections: document.querySelectorAll('.mode-section'),
    copyButtons: document.querySelectorAll('.copy-btn'),
    notification: document.getElementById('notification'),
    inputs: {
        json: document.getElementById('jsonInput'),
        paths: document.getElementById('pathsInput'),
        values: document.getElementById('valuesInput')
    },
    results: {
        paths: document.getElementById('pathsResult'),
        values: document.getElementById('valuesResult'),
        json: document.getElementById('jsonResult')
    }
};

// Event Listeners
elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => switchMode(tab.dataset.mode));
});

elements.copyButtons.forEach(btn => {
    btn.addEventListener('click', () => copyToClipboard(btn.dataset.clipboard));
});

document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const activeMode = document.querySelector('.tab.active').dataset.mode;
        activeMode === 'json-to-path' ? jsonToPaths() : pathsToJson();
    }
});

// Mode Switching
function switchMode(mode) {
    elements.tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    elements.sections.forEach(section => {
        section.style.display = section.id.includes(mode) ? 'block' : 'none';
    });
}

// Clipboard Operations
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    element.select();
    document.execCommand('copy');
    showNotification('Copied to clipboard!', 'success');
}

function showNotification(message, type = 'success') {
    const notification = elements.notification;
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    setTimeout(() => notification.classList.remove('show'), 2000);
}

// JSON Path Operations
function findPaths(obj, parentPath = '') {
    const paths = [];
    const values = [];
    
    function traverse(current, path) {
        if (Array.isArray(current)) {
            if (current.every(item => typeof item !== 'object' || item === null)) {
                paths.push(path);
                values.push(JSON.stringify(current));
            } else {
                current.forEach((item, index) => {
                    if (typeof item === 'object' && item !== null) {
                        Object.entries(item).forEach(([key, value]) => {
                            const currentPath = `${path}[${index}].${key}`;
                            if (Array.isArray(value)) {
                                paths.push(currentPath);
                                values.push(JSON.stringify(value));
                            } else {
                                paths.push(currentPath);
                                values.push(String(value));
                            }
                        });
                    }
                });
            }
        } else {
            Object.entries(current).forEach(([key, value]) => {
                const currentPath = path ? `${path}.${key}` : key;
                if (Array.isArray(value) && value.every(item => typeof item === 'object')) {
                    value.forEach((item, index) => {
                        if (typeof item === 'object' && item !== null) {
                            Object.entries(item).forEach(([subKey, subValue]) => {
                                const arrayPath = `${currentPath}[${index}].${subKey}`;
                                if (Array.isArray(subValue)) {
                                    paths.push(arrayPath);
                                    values.push(JSON.stringify(subValue));
                                } else {
                                    paths.push(arrayPath);
                                    values.push(String(subValue));
                                }
                            });
                        }
                    });
                } else if (Array.isArray(value)) {
                    paths.push(currentPath);
                    values.push(JSON.stringify(value));
                } else if (typeof value === 'object' && value !== null) {
                    traverse(value, currentPath);
                } else {
                    paths.push(currentPath);
                    values.push(String(value));
                }
            });
        }
    }
    
    traverse(obj, '');
    return {
        paths: paths.join(', '),
        values: values.join(', ')
    };
}

// Conversion Functions
function jsonToPaths() {
    try {
        const jsonInput = elements.inputs.json.value.trim();
        if (!jsonInput) throw new Error('Please enter JSON data');
        
        const json = JSON.parse(jsonInput);
        const { paths, values } = findPaths(json);
        
        if (!paths) throw new Error('No valid paths found in JSON');
        
        elements.results.paths.value = paths;
        elements.results.values.value = values;
        
        animateSuccess([elements.results.paths, elements.results.values]);
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function pathsToJson() {
    try {
        // Split while preserving array brackets
        const splitPathsAndValues = (str) => {
            let result = [];
            let current = '';
            let inBrackets = 0;
            
            for (let char of str) {
                if (char === '[') inBrackets++;
                if (char === ']') inBrackets--;
                
                if (char === ',' && inBrackets === 0) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            if (current) result.push(current.trim());
            return result;
        };

        const paths = splitPathsAndValues(elements.inputs.paths.value);
        const values = splitPathsAndValues(elements.inputs.values.value);
        
        if (!paths.length || !values.length) {
            throw new Error('Please enter both paths and values');
        }
        
        if (paths.length !== values.length) {
            throw new Error('Number of paths and values must match');
        }
        
        const result = {};
        
        paths.forEach((path, index) => {
            let current = result;
            const segments = path.match(/[^\.\[\]]+|\[\d+\]/g) || [];
            const lastSegment = segments.pop();
            
            segments.forEach(segment => {
                if (segment.startsWith('[')) {
                    const arrayIndex = parseInt(segment.slice(1, -1));
                    if (!Array.isArray(current)) {
                        throw new Error(`Invalid array path at ${path}`);
                    }
                    current[arrayIndex] = current[arrayIndex] || {};
                    current = current[arrayIndex];
                } else {
                    const nextIsArray = segments[segments.indexOf(segment) + 1]?.startsWith('[');
                    current[segment] = current[segment] || (nextIsArray ? [] : {});
                    current = current[segment];
                }
            });
            
            let finalValue = values[index].trim();
            try {
                finalValue = JSON.parse(finalValue);
            } catch {
                // Keep as string if not valid JSON
            }
            
            if (lastSegment.startsWith('[')) {
                const arrayIndex = parseInt(lastSegment.slice(1, -1));
                current[arrayIndex] = finalValue;
            } else {
                current[lastSegment] = finalValue;
            }
        });
        
        elements.results.json.value = JSON.stringify(result, null, 2);
        animateSuccess([elements.results.json]);
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function animateSuccess(elements) {
    elements.forEach(element => {
        element.style.transition = 'background-color 0.3s ease';
        element.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
        setTimeout(() => element.style.backgroundColor = '', 500);
    });
}

// Initialize with example
document.addEventListener('DOMContentLoaded', () => {
    const example = {
        name: "John Doe",
        job: "QA Lead",
        details: {
            age: 30,
            location: "New York"
        }
    };
    elements.inputs.json.value = JSON.stringify(example, null, 2);
});