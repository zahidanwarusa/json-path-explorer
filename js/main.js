// DOM Elements and State
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
    const result = {
        paths: [],
        values: []
    };
    
    function traverse(current, path) {
        for (const [key, value] of Object.entries(current)) {
            const currentPath = path ? `${path}.${key}` : key;
            
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                traverse(value, currentPath);
            } else {
                result.paths.push(currentPath);
                result.values.push(String(value));
            }
        }
    }
    
    traverse(obj, parentPath);
    return result;
}

// Conversion Functions
function jsonToPaths() {
    try {
        const jsonInput = elements.inputs.json.value.trim();
        if (!jsonInput) throw new Error('Please enter JSON data');
        
        const json = JSON.parse(jsonInput);
        const { paths, values } = findPaths(json);
        
        if (paths.length === 0) throw new Error('No valid paths found in JSON');
        
        elements.results.paths.value = paths.join(', ');
        elements.results.values.value = values.join(', ');
        
        animateSuccess([elements.results.paths, elements.results.values]);
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function pathsToJson() {
    try {
        const paths = elements.inputs.paths.value.split(',').map(p => p.trim());
        const values = elements.inputs.values.value.split(',').map(v => v.trim());
        
        if (!paths.length || !values.length) {
            throw new Error('Please enter both paths and values');
        }
        
        if (paths.length !== values.length) {
            throw new Error('Number of paths and values must match');
        }
        
        const result = {};
        paths.forEach((path, index) => {
            let current = result;
            const parts = path.split('.');
            const lastPart = parts.pop();
            
            for (const part of parts) {
                current[part] = current[part] || {};
                current = current[part];
            }
            
            current[lastPart] = parseValue(values[index]);
        });
        
        elements.results.json.value = JSON.stringify(result, null, 2);
        animateSuccess([elements.results.json]);
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Helper Functions
function parseValue(value) {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    if (value === 'null') return null;
    if (!isNaN(value) && value.trim() !== '') return Number(value);
    return value;
}

function animateSuccess(elements) {
    elements.forEach(element => {
        element.style.transition = 'background-color 0.3s ease';
        element.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
        setTimeout(() => {
            element.style.backgroundColor = '';
        }, 500);
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