/**
 * ============================================
 * 🛰️ Image to location find 
 * Professional Image to location find Tool
 * Developer: Nawab Zada Hacker
 * Version: 2.0.0
 * License: MIT (only for Security Testing Only)
 * ============================================
 */

(function () {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    const CONFIG = Object.freeze({
        MAX_FILE_SIZE: 20 * 1024 * 1024, // 20MB
        ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
        MAP_TILES: {
            SATELLITE: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            LABELS: 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png'
        },
        GEOCODE_ENDPOINT: 'https://nominatim.openstreetmap.org/reverse',
        DEFAULT_CENTER: [20, 0],
        DEFAULT_ZOOM: 2,
        GPS_ZOOM: 16,
        APP: {
            NAME: 'Image to location find',
            VERSION: '2.0.0',
            AUTHOR: 'Nawab Zada Hacker',
            PLATFORM: 'social'
        }
    });

    // ============================================
    // STATE
    // ============================================
    const state = {
        map: null,
        marker: null,
        latitude: null,
        longitude: null,
        exifData: null,
        satelliteLayer: null,
        labelsLayer: null,
        showLabels: true,
        isFullscreen: false,
        isProcessing: false
    };

    // ============================================
    // DOM REFS
    // ============================================
    const DOM = {
        uploadZone: document.getElementById('uploadZone'),
        imageInput: document.getElementById('imageInput'),
        previewContainer: document.getElementById('previewContainer'),
        previewImg: document.getElementById('previewImg'),
        previewLoader: document.getElementById('previewLoader'),
        removeImageBtn: document.getElementById('removeImageBtn'),
        statusBar: document.getElementById('statusBar'),
        statusIcon: document.getElementById('statusIcon'),
        statusText: document.getElementById('statusText'),
        statusClose: document.getElementById('statusClose'),
        exifContainer: document.getElementById('exifContainer'),
        exifEmpty: document.getElementById('exifEmpty'),
        exifTable: document.getElementById('exifTable'),
        exifCount: document.getElementById('exifCount'),
        exifFooter: document.getElementById('exifFooter'),
        exportExifBtn: document.getElementById('exportExifBtn'),
        mapElement: document.getElementById('map'),
        mapControls: document.getElementById('mapControls'),
        mapOverlay: document.getElementById('mapOverlay'),
        mapEmpty: document.getElementById('mapEmpty'),
        overlayCoords: document.getElementById('overlayCoords'),
        overlayAddress: document.getElementById('overlayAddress'),
        copyCoordsBtn: document.getElementById('copyCoordsBtn'),
        openMapsBtn: document.getElementById('openMapsBtn'),
        zoomInBtn: document.getElementById('zoomInBtn'),
        zoomOutBtn: document.getElementById('zoomOutBtn'),
        fullscreenBtn: document.getElementById('fullscreenBtn'),
        layerToggleBtn: document.getElementById('layerToggleBtn'),
        navToggle: document.querySelector('.nav-toggle'),
        navLinks: document.querySelector('.nav-links')
    };

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
    }

    function formatDate(dateStr) {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch {
            return dateStr;
        }
    }

    function escapeHTML(str) {
        if (typeof str !== 'string') return String(str || '');
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function debounce(fn, delay = 300) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // ============================================
    // STATUS BAR
    // ============================================

    function showStatus(message, type = 'info') {
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        DOM.statusIcon.textContent = icons[type] || 'ℹ️';
        DOM.statusText.textContent = message;
        DOM.statusBar.className = status-bar ${type};
        DOM.statusBar.hidden = false;
        if (type === 'success') {
            setTimeout(() => { DOM.statusBar.hidden = true; }, 5000);
        }
    }

    function hideStatus() { DOM.statusBar.hidden = true; }
    DOM.statusClose.addEventListener('click', hideStatus);

    // ============================================
    // MAP INITIALIZATION
    // ============================================

    function initMap() {
        state.map = L.map('map', {
            center: CONFIG.DEFAULT_CENTER,
            zoom: CONFIG.DEFAULT_ZOOM,
            zoomControl: false,
            attributionControl: true,
            fadeAnimation: true,
            zoomAnimation: true
        });

        state.satelliteLayer = L.tileLayer(CONFIG.MAP_TILES.SATELLITE, {
            attribution: '&copy; Esri, Maxar, Earthstar Geographics',
            maxZoom: 20,
            minZoom: 2
        }).addTo(state.map);

        state.labelsLayer = L.tileLayer(CONFIG.MAP_TILES.LABELS, {
            attribution: '&copy; OpenStreetMap, CartoDB',
            maxZoom: 20,
            minZoom: 2,
            pane: 'overlayPane'
        }).addTo(state.map);

        setTimeout(() => state.map.invalidateSize(), 100);
        setTimeout(() => state.map.invalidateSize(), 500);
        DOM.mapControls.hidden = false;
    }

    // ============================================
    // CUSTOM MARKER
    // ============================================

    function createMarkerIcon() {
        return L.divIcon({
            className: 'custom-marker-icon',
            html: <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #00d4ff, #0066ff); border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 0 30px rgba(0,212,255,0.6), 0 4px 12px rgba(0,0,0,0.4); border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; animation: markerPulse 2s ease-in-out infinite;"><span style="transform:rotate(45deg);font-size:20px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));">📍</span></div>,
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -45]
        });
    }

    const markerStyle = document.createElement('style');
    markerStyle.textContent = @keyframes markerPulse { 0%, 100% { box-shadow: 0 0 30px rgba(0,212,255,0.6), 0 4px 12px rgba(0,0,0,0.4); } 50% { box-shadow: 0 0 50px rgba(0,212,255,0.9), 0 4px 20px rgba(0,0,0,0.5); } };
    document.head.appendChild(markerStyle);

    // ============================================
    // MAP UPDATE
    // ============================================

    function updateMap(latitude, longitude) {
        if (!state.map) return;
        state.latitude = latitude;
        state.longitude = longitude;
        if (state.marker) state.map.removeLayer(state.marker);
        state.marker = L.marker([latitude, longitude], { icon: createMarkerIcon() }).addTo(state.map);
        state.marker.bindPopup(<div style="font-family:'Segoe UI',sans-serif;padding:4px;"><b style="color:#00d4ff;">📍 Target Location</b><br><span style="font-family:monospace;font-size:13px;">${latitude.toFixed(6)}°N, ${longitude.toFixed(6)}°E</span></div>);
        state.map.setView([latitude, longitude], CONFIG.GPS_ZOOM);
        DOM.mapOverlay.hidden = false;
        DOM.overlayCoords.textContent = ${latitude.toFixed(6)}°N, ${longitude.toFixed(6)}°E;
        reverseGeocode(latitude, longitude);
        DOM.openMapsBtn.href = https://www.google.com/maps?q=${latitude},${longitude};
    }

    // ============================================
    // REVERSE GEOCODING
    // ============================================

    async function reverseGeocode(lat, lng) {
        try {
            DOM.overlayAddress.textContent = '📍 Resolving address...';
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(${CONFIG.GEOCODE_ENDPOINT}?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1, { signal: controller.signal });
            clearTimeout(timeout);
            if (!response.ok) throw new Error(HTTP ${response.status});
            const data = await response.json();
            if (data && data.display_name) {
                const address = data.display_name.length > 120 ? data.display_name.substring(0, 117) + '...' : data.display_name;
                DOM.overlayAddress.textContent = 📍 ${address};
            } else {
                DOM.overlayAddress.textContent = '📍 Satellite view (address unavailable)';
            }
        } catch (error) {
            if (error.name === 'AbortError') DOM.overlayAddress.textContent = '📍 Satellite view (geocode timeout)';
            else { DOM.overlayAddress.textContent = '📍 Satellite view'; console.warn('Geocode error:', error.message); }
        }
    }

    function resetMap() {
        if (state.marker) { state.map.removeLayer(state.marker); state.marker = null; }
        state.latitude = null; state.longitude = null;
        state.map.setView(CONFIG.DEFAULT_CENTER, CONFIG.DEFAULT_ZOOM);
        DOM.mapOverlay.hidden = true;
        DOM.mapEmpty.hidden = false;
    }

    // ============================================
    // EXIF PARSING & RENDERING
    // ============================================

    const EXIF_FIELDS = [
        { label: '📷 Camera', key: 'Make', formatter: (v, d) => v + (d.Model ? ' ' + d.Model : '') },
        { label: '📅 Date/Time', key: 'DateTimeOriginal', formatter: formatDate },
        { label: '⚙️ Aperture', key: 'FNumber', formatter: v => f/${v} },
        { label: '🔆 ISO', key: 'ISO' },
        { label: '🔭 Focal Length', key: 'FocalLength', formatter: v => ${v}mm },
        { label: '⏱️ Shutter Speed', key: 'ExposureTime', formatter: v => ${v}s },
        { label: '📏 Image Width', key: 'ExifImageWidth', formatter: v => ${v}px },
        { label: '📏 Image Height', key: 'ExifImageHeight', formatter: v => ${v}px },
        { label: '💾 File Size', key: '_fileSize', formatter: formatBytes },
        { label: '📄 File Type', key: '_fileType' }
    ];

    const GPS_FIELDS = [
        { label: '🌐 Latitude', key: 'latitude', formatter: v => ${v.toFixed(6)}° N, cls: 'gps' },
        { label: '🌐 Longitude', key: 'longitude', formatter: v => ${v.toFixed(6)}° E, cls: 'gps' },
        { label: '📍 Coordinates', key: '_coordPair', cls: 'gps' },
        { label: '📏 Altitude', key: 'altitude', formatter: v => ${v} m, cls: 'gps' }
    ];

    function renderEXIF(exifData, file) {
        DOM.exifEmpty.hidden = true;
        DOM.exifTable.hidden = false;
        DOM.exifFooter.hidden = false;
        let html = '';
        let fieldCount = 0;
        const fileInfo = { _fileSize: file?.size || 0, _fileType: file?.type || 'Unknown' };
        const hasGps = exifData?.latitude != null && exifData?.longitude != null;

        if (hasGps) {
            for (const field of GPS_FIELDS) {
                let value = (field.key === '_coordPair') ? ${exifData.latitude.toFixed(6)}, ${exifData.longitude.toFixed(6)} : exifData[field.key];
                if (value != null) {
                    const formatted = field.formatter ? field.formatter(value, exifData) : value;
                    html += <div class="exif-row"><span class="exif-label">${field.label}</span><span class="exif-value ${field.cls || ''}">${escapeHTML(String(formatted))}</span></div>;
                    fieldCount++;
                }
            }
            html += <div class="exif-row" style="border-bottom-color: rgba(0,180,255,0.08);"><span class="exif-label" style="font-size:10px;color:rgba(89,119,153,0.5);text-transform:uppercase;letter-spacing:1px;">— Other EXIF —</span><span></span></div>;
        }

        for (const field of EXIF_FIELDS) {
            if (field.key.startsWith('_')) continue;
            let value = exifData[field.key];
            if (value != null) {
                const formatted = field.formatter ? field.formatter(value, exifData) : value;
                html += <div class="exif-row"><span class="exif-label">${field.label}</span><span class="exif-value">${escapeHTML(String(formatted))}</span></div>;
                fieldCount++;
            }
        }

        if (!hasGps) html += <div class="exif-row"><span class="exif-label">📍 GPS Location</span><span class="exif-value missing">⚠️ Not available in this image</span></div>;
        DOM.exifTable.innerHTML = html;
        DOM.exifCount.textContent = ${fieldCount} fields;
    }

    function clearEXIF() {
        DOM.exifEmpty.hidden = false;
        DOM.exifTable.hidden = true;
        DOM.exifFooter.hidden = true;
        DOM.exifTable.innerHTML = '';
        DOM.exifCount.textContent = '0 fields';
    }

    // ============================================
    // EXPORT EXIF JSON
    // ============================================

    DOM.exportExifBtn.addEventListener('click', () => {
        if (!state.exifData) return;
        const exportData = {
            tool: CONFIG.APP.NAME,
            version: CONFIG.APP.VERSION,
            author: CONFIG.APP.AUTHOR,
            timestamp: new Date().toISOString(),
            coordinates: state.latitude && state.longitude ? { latitude: state.latitude, longitude: state.longitude } : null,
            metadata: state.exifData
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = geolocator-export-${Date.now()}.json;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showStatus('📦 EXIF data exported as JSON', 'success');
    });

    // ============================================
    // CORE: PROCESS IMAGE
    // ============================================

    async function processImage(file) {
        if (!file) { showStatus('❌ No file selected.', 'error'); return; }
        if (!CONFIG.ALLOWED_TYPES.includes(file.type)) { showStatus(❌ Unsupported format: ${file.type}. Use JPEG, PNG, or WEBP., 'error'); return; }
        if (file.size > CONFIG.MAX_FILE_SIZE) { showStatus(❌ File too large (${formatBytes(file.size)}). Max 20MB., 'error'); return; }
        if (state.isProcessing) return;
        state.isProcessing = true;
        DOM.previewLoader.hidden = false;
        try {
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsDataURL(file);
            });
            DOM.previewImg.src = dataUrl;
            DOM.previewContainer.hidden = false;
            DOM.previewLoader.hidden = true;
            showStatus('🔍 Analyzing EXIF metadata...', 'info');
            const exifData = await exifr.parse(file, true);
            state.exifData = exifData || {};
            const gps = await exifr.gps(file);
            const lat = gps?.latitude;
            const lng = gps?.longitude;
            if (lat != null && lng != null) {
                state.exifData.latitude = lat;
                state.exifData.longitude = lng;
                if (gps.altitude != null) state.exifData.altitude = gps.altitude;
            }
            renderEXIF(state.exifData, file);
            if (lat != null && lng != null) {
                DOM.mapEmpty.hidden = true;
                updateMap(lat, lng);
                showStatus(📍 GPS found! ${lat.toFixed(6)}, ${lng.toFixed(6)}, 'success');
            } else {
                resetMap();
                DOM.mapEmpty.hidden = false;
                showStatus('⚠️ No GPS coordinates embedded in this image.', 'warning');
            }
        } catch (error) {
            console.error('Processing error:', error);
            showStatus(❌ Error: ${error.message}, 'error');
            DOM.previewLoader.hidden = true;
            clearEXIF();
            resetMap();
        } finally {
            state.isProcessing = false;
        }
    }

    function removeImage() {
        DOM.previewContainer.hidden = true;
        DOM.previewImg.src = '';
        DOM.imageInput.value = '';
        clearEXIF();
        resetMap();
        DOM.mapEmpty.hidden = false;
        hideStatus();
        state.exifData = null;
    }

    DOM.removeImageBtn.addEventListener('click', removeImage);
    DOM.imageInput.addEventListener('change', (e) => { if (e.target.files.length > 0) processImage(e.target.files[0]); });

    DOM.uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); DOM.uploadZone.classList.add('drag-over'); });
    DOM.uploadZone.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); DOM.uploadZone.classList.remove('drag-over'); });
    DOM.uploadZone.addEventListener('drop', (e) => {
        e.preventDefault(); e.stopPropagation(); DOM.uploadZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            const dt = new DataTransfer(); dt.items.add(file);
            DOM.imageInput.files = dt.files;
            processImage(file);
        }
    });

    DOM.uploadZone.addEventListener('click', (e) => { if (e.target !== DOM.imageInput) DOM.imageInput.click(); });

    // ============================================
    // MAP CONTROLS & UTILS
    // ============================================

    DOM.zoomInBtn.addEventListener('click', () => { if (state.map) state.map.zoomIn(); });
    DOM.zoomOutBtn.addEventListener('click', () => { if (state.map) state.map.zoomOut(); });
    DOM.fullscreenBtn.addEventListener('click', () => {
        const el = DOM.mapElement;
        if (!state.isFullscreen) {
            if (el.requestFullscreen) el.requestFullscreen();
            else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
            el.classList.add('fullscreen'); state.isFullscreen = true;
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            el.classList.remove('fullscreen'); state.isFullscreen = false;
        }
        setTimeout(() => state.map?.invalidateSize(), 300);
    });

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            DOM.mapElement.classList.remove('fullscreen');
            state.isFullscreen = false;
            setTimeout(() => state.map?.invalidateSize(), 300);
        }
    });

    DOM.layerToggleBtn.addEventListener('click', () => {
        state.showLabels = !state.showLabels;
        if (state.showLabels) { state.labelsLayer?.addTo(state.map); DOM.layerToggleBtn.style.opacity = '1'; }
        else { state.map?.removeLayer(state.labelsLayer); DOM.layerToggleBtn.style.opacity = '0.4'; }
    });

    DOM.copyCoordsBtn.addEventListener('click', async () => {
        if (state.latitude == null || state.longitude == null) return;
        const text = ${state.latitude.toFixed(6)}, ${state.longitude.toFixed(6)};
        try {
            await navigator.clipboard.writeText(text);
            const orig = DOM.copyCoordsBtn.innerHTML;
            DOM.copyCoordsBtn.innerHTML = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!;
            setTimeout(() => { DOM.copyCoordsBtn.innerHTML = orig; }, 2000);
        } catch {
            const textarea = document.createElement('textarea'); textarea.value = text;
            document.body.appendChild(textarea); textarea.select(); document.execCommand('copy');
            document.body.removeChild(textarea); showStatus('📋 Coordinates copied!', 'success');
        }
    });

    DOM.navToggle.addEventListener('click', () => {
        const isOpen = DOM.navLinks.classList.toggle('open');
        DOM.navToggle.setAttribute('aria-expanded', isOpen);
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            DOM.navLinks.classList.remove('open');
            DOM.navToggle.setAttribute('aria-expanded', 'false');
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideStatus();
        if (e.ctrlKey && e.shiftKey && e.key === 'I') { e.preventDefault(); DOM.imageInput.click(); }
    });

    function init() {
        console.log(\n🛰️ ${CONFIG.APP.NAME} v${CONFIG.APP.VERSION}\nDeveloper: ${CONFIG.APP.AUTHOR}\nPlatform: ${CONFIG.APP.PLATFORM}\nStatus: Initialized\n);
        initMap();
        clearEXIF();
        DOM.mapEmpty.hidden = false;
        const handleResize = debounce(() => { state.map?.invalidateSize(); }, 250);
        window.addEventListener('resize', handleResize);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
