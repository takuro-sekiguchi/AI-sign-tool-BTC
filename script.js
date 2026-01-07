/**
 * Bitcoin AI Signal Tool
 * Main JavaScript Application
 */

class BitcoinSignalApp {
    constructor() {
        this.chart = null;
        this.candlestickSeries = null;
        this.currentLanguage = 'ja';
        this.currentTimeframe = '1m';
        this.dataCache = new Map(); // 各時間足のデータキャッシュ
        this.signalCache = new Map(); // 各時間足のサインキャッシュ
        this.masterSignals = []; // 全サインのマスターデータ（タイムスタンプベース）
        
        this.init();
    }

    async init() {
        console.log('Initializing Bitcoin AI Signal Tool...');
        
        // Initialize components
        this.setupEventListeners();
        this.initializeChart();
        this.setupTimeframeButtons();
        
        console.log('Application initialized successfully');
    }

    setupEventListeners() {
        // Language selector
        const languageSelector = document.querySelector('.language-selector');
        if (languageSelector) {
            languageSelector.addEventListener('change', (e) => {
                this.changeLanguage(e.target.value);
            });
        }

        // Window resize handler
        window.addEventListener('resize', () => {
            if (this.chart) {
                setTimeout(() => {
                    this.chart.applyOptions({ 
                        width: this.getChartWidth(),
                        height: this.getChartHeight()
                    });
                    console.log('Chart resized to:', this.getChartWidth(), 'x', this.getChartHeight());
                }, 100);
            }
        });
    }

    setupTimeframeButtons() {
        const timeframeButtons = document.querySelectorAll('.timeframe-btn');
        timeframeButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const newTimeframe = e.target.getAttribute('data-timeframe');
                if (newTimeframe !== this.currentTimeframe) {
                    await this.changeTimeframe(newTimeframe);
                }
            });
        });
    }

    initializeChart() {
        const chartContainer = document.getElementById('tradingview-chart');
        if (!chartContainer) {
            console.error('Chart container not found');
            this.showError('チャートコンテナが見つかりません');
            return;
        }

        console.log('Chart container found:', chartContainer);
        console.log('Container dimensions:', chartContainer.clientWidth, 'x', chartContainer.clientHeight);

        // Check if LightweightCharts is available
        if (typeof LightweightCharts === 'undefined') {
            console.error('LightweightCharts library not loaded');
            this.showError('TradingViewライブラリの読み込みに失敗しました。ネットワーク接続を確認してください。');
            return;
        }

        console.log('LightweightCharts version:', LightweightCharts.version || 'version unknown');
        console.log('Available methods:', Object.keys(LightweightCharts));

        try {
            console.log('Creating chart with dimensions:', this.getChartWidth(), 'x', this.getChartHeight());
            
            // Create chart with simplified dark theme
            this.chart = LightweightCharts.createChart(chartContainer, {
                width: this.getChartWidth(),
                height: this.getChartHeight(),
                layout: {
                    background: { color: '#0a0a0a' },
                    textColor: '#ffffff',
                },
                grid: {
                    vertLines: { color: '#333338' },
                    horzLines: { color: '#333338' },
                },
                crosshair: {
                    mode: LightweightCharts.CrosshairMode.Normal,
                },
                rightPriceScale: {
                    borderColor: '#333338',
                },
                timeScale: {
                    borderColor: '#333338',
                    timeVisible: true,
                    secondsVisible: false,
                },
                handleScroll: {
                    vertTouchDrag: true,
                },
            });

            console.log('Chart created successfully, adding candlestick series...');
            
            // Add candlestick series
            this.candlestickSeries = this.chart.addCandlestickSeries({
                upColor: '#0361ad',
                downColor: '#ea5394',
                borderUpColor: '#0361ad',
                borderDownColor: '#ea5394',
                wickUpColor: '#0361ad',
                wickDownColor: '#ea5394',
            });
            
            console.log('Candlestick series added successfully');

            console.log('Chart initialized successfully');
            
            // Add sample data for testing
            this.addSampleData();
            
            // Generate and add AI signals
            this.generateMasterSignals();
            this.updateSignalsForTimeframe(this.currentTimeframe);
            
        } catch (error) {
            console.error('Failed to initialize chart:', error);
            this.showError('チャートの初期化に失敗しました');
        }
    }

    getChartWidth() {
        const container = document.getElementById('tradingview-chart');
        if (!container) return 800;
        
        // Get the actual available width
        const rect = container.getBoundingClientRect();
        const width = Math.max(300, rect.width || container.clientWidth || container.offsetWidth);
        console.log('Chart width calculation:', width);
        return width;
    }

    getChartHeight() {
        const container = document.getElementById('tradingview-chart');
        if (!container) return 600;
        
        // Get the actual available height
        const rect = container.getBoundingClientRect();
        const height = Math.max(400, rect.height || container.clientHeight || container.offsetHeight);
        console.log('Chart height calculation:', height);
        return height;
    }


    addSampleData() {
        if (!this.candlestickSeries) return;

        // Generate data for current timeframe
        const data = this.generateTimeframeData(this.currentTimeframe);
        this.dataCache.set(this.currentTimeframe, data);
        
        // Set data to the chart
        this.candlestickSeries.setData(data);
        
        console.log(`Sample data added for ${this.currentTimeframe}:`, data.length, 'data points');
        
        // すぐにテスト用サインを追加
        this.addTestSignals();
    }
    
    addTestSignals() {
        if (!this.candlestickSeries) return;
        
        // 現在のデータ範囲からいくつかのポイントを選んでサインを配置
        const data = this.dataCache.get(this.currentTimeframe);
        if (!data || data.length < 10) return;
        
        const testMarkers = [
            {
                time: data[Math.floor(data.length * 0.2)].time,
                position: 'belowBar',
                color: '#00D4FF',
                shape: 'arrowUp',
                size: 2
            },
            {
                time: data[Math.floor(data.length * 0.5)].time,
                position: 'aboveBar', 
                color: '#FF4081',
                shape: 'arrowDown',
                size: 2
            },
            {
                time: data[Math.floor(data.length * 0.8)].time,
                position: 'belowBar',
                color: '#00D4FF',
                shape: 'arrowUp',
                size: 2
            }
        ];
        
        this.candlestickSeries.setMarkers(testMarkers);
        console.log('Test signals added:', testMarkers.length, 'markers');
    }

    generateTimeframeData(timeframe) {
        const barCounts = 1000; // 1000本固定
        const now = new Date();
        
        // 時間足ごとの間隔（分）
        const intervals = {
            '1m': 1,
            '5m': 5, 
            '15m': 15,
            '1h': 60,
            '4h': 240,
            '1d': 1440
        };
        
        const intervalMinutes = intervals[timeframe];
        const data = [];
        let basePrice = 45000;
        
        for (let i = barCounts - 1; i >= 0; i--) {
            const time = new Date(now.getTime() - (i * intervalMinutes * 60 * 1000));
            
            // より現実的な価格変動を生成
            const volatility = this.getTimeframeVolatility(timeframe);
            const change = (Math.random() - 0.5) * volatility;
            basePrice = Math.max(30000, basePrice + change);
            
            const open = basePrice;
            const close = open + (Math.random() - 0.5) * (volatility * 0.5);
            const high = Math.max(open, close) + Math.random() * (volatility * 0.3);
            const low = Math.min(open, close) - Math.random() * (volatility * 0.3);
            
            data.push({
                time: Math.floor(time.getTime() / 1000),
                open: Math.round(open),
                high: Math.round(high),
                low: Math.round(low),
                close: Math.round(close)
            });
            
            basePrice = close;
        }
        
        return data;
    }

    getTimeframeVolatility(timeframe) {
        // 時間足ごとの価格変動幅
        const volatilities = {
            '1m': 50,   // 1分足：小さな変動
            '5m': 150,  // 5分足
            '15m': 300, // 15分足
            '1h': 500,  // 1時間足
            '4h': 1000, // 4時間足
            '1d': 2000  // 日足：大きな変動
        };
        return volatilities[timeframe] || 500;
    }

    // AIサイン生成・管理機能
    generateMasterSignals() {
        // データ範囲内でサインを生成（1000本のデータ範囲内）
        const now = new Date();
        const signals = [];
        
        // 1000本の1分足データ範囲内でサインを配置
        const dataStartTime = now.getTime() - (1000 * 60 * 1000); // 1000分前
        const signalCount = 8; // 固定で8個のサイン
        
        for (let i = 0; i < signalCount; i++) {
            // データ範囲内でランダムな時刻を選択
            const randomOffset = Math.random() * (1000 * 60 * 1000); // 0-1000分の範囲
            const timestamp = Math.floor((dataStartTime + randomOffset) / 1000);
            
            const signalType = Math.random() > 0.5 ? 'buy' : 'sell';
            const basePrice = 45000 + (Math.random() - 0.5) * 8000;
            
            signals.push({
                id: `signal_${i}_${timestamp}`,
                timestamp: timestamp,
                type: signalType,
                price: Math.round(basePrice),
                reason: this.generateSignalReason(signalType),
                confidence: Math.round((Math.random() * 25 + 75)) // 75-100%の信頼度
            });
        }
        
        // タイムスタンプでソート
        this.masterSignals = signals.sort((a, b) => a.timestamp - b.timestamp);
        console.log('Master signals generated:', this.masterSignals.length, 'signals');
        console.log('Signal timestamps:', this.masterSignals.map(s => new Date(s.timestamp * 1000).toLocaleString()));
    }

    generateSignalReason(type) {
        const buyReasons = [
            'RSI oversold + bullish divergence detected',
            'Support level bounce + volume surge',
            'Moving average golden cross formation',
            'Bullish flag pattern breakout confirmed',
            'Fibonacci retracement 61.8% support'
        ];
        
        const sellReasons = [
            'RSI overbought + bearish divergence',
            'Resistance level rejection + high volume', 
            'Moving average death cross formation',
            'Head and shoulders pattern completed',
            'Double top formation confirmed'
        ];
        
        const reasons = type === 'buy' ? buyReasons : sellReasons;
        return reasons[Math.floor(Math.random() * reasons.length)];
    }

    updateSignalsForTimeframe(timeframe) {
        if (!this.candlestickSeries || this.masterSignals.length === 0) return;
        
        // キャッシュからサインデータを取得
        let timeframeSignals = this.signalCache.get(timeframe);
        
        if (!timeframeSignals) {
            // この時間足用のサインデータを生成
            timeframeSignals = this.convertSignalsToTimeframe(timeframe);
            this.signalCache.set(timeframe, timeframeSignals);
        }
        
        // サインマーカーをcandlestick seriesに設定
        this.candlestickSeries.setMarkers(timeframeSignals);
        console.log(`Signals updated for ${timeframe}:`, timeframeSignals.length, 'markers');
    }

    convertSignalsToTimeframe(timeframe) {
        const intervals = {
            '1m': 60,
            '5m': 300,
            '15m': 900,
            '1h': 3600,
            '4h': 14400,
            '1d': 86400
        };
        
        const intervalSeconds = intervals[timeframe];
        const markers = [];
        
        for (const signal of this.masterSignals) {
            // サインのタイムスタンプをこの時間足の開始時刻に調整
            const adjustedTime = Math.floor(signal.timestamp / intervalSeconds) * intervalSeconds;
            
            const marker = {
                time: adjustedTime,
                position: signal.type === 'buy' ? 'belowBar' : 'aboveBar',
                color: signal.type === 'buy' ? '#00D4FF' : '#FF4081',
                shape: signal.type === 'buy' ? 'arrowUp' : 'arrowDown',
                size: 2
            };
            
            markers.push(marker);
        }
        
        return markers;
    }

    getTimeframeName(timeframe) {
        const names = {
            '1m': '1分足',
            '5m': '5分足',
            '15m': '15分足', 
            '1h': '1時間足',
            '4h': '4時間足',
            '1d': '日足'
        };
        return names[timeframe] || timeframe;
    }

    async changeTimeframe(newTimeframe) {
        if (newTimeframe === this.currentTimeframe) return;
        
        try {
            // ボタンの状態を更新
            this.updateTimeframeButtons(newTimeframe);
            
            // データをキャッシュから取得、なければ生成
            let data = this.dataCache.get(newTimeframe);
            if (!data) {
                data = this.generateTimeframeData(newTimeframe);
                this.dataCache.set(newTimeframe, data);
            }
            
            // チャートデータを更新
            this.candlestickSeries.setData(data);
            
            // サインを新しい時間足に更新（追従機能）
            this.updateSignalsForTimeframe(newTimeframe);
            
            this.currentTimeframe = newTimeframe;
            
            console.log(`Timeframe changed to: ${newTimeframe}`);
            
        } catch (error) {
            console.error('Failed to change timeframe:', error);
            this.showError('時間足の切り替えに失敗しました');
        }
    }

    updateTimeframeButtons(activeTimeframe) {
        const buttons = document.querySelectorAll('.timeframe-btn');
        buttons.forEach(button => {
            const timeframe = button.getAttribute('data-timeframe');
            if (timeframe === activeTimeframe) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    changeLanguage(lang) {
        this.currentLanguage = lang;
        console.log(`Language changed to: ${lang}`);
        // Language change implementation will be added in Phase 4
    }

    showError(message) {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.style.cssText = `
            background-color: var(--accent-pink);
            color: white;
            padding: 12px 16px;
            border-radius: 4px;
            margin-bottom: 8px;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    showSuccess(message) {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.style.cssText = `
            background-color: var(--accent-blue);
            color: white;
            padding: 12px 16px;
            border-radius: 4px;
            margin-bottom: 8px;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.signalApp = new BitcoinSignalApp();
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});