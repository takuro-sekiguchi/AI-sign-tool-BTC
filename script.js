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
                    fontSize: 12,
                },
                leftPriceScale: {
                    visible: false,
                },
                grid: {
                    vertLines: { visible: false },
                    horzLines: { visible: false },
                },
                crosshair: {
                    mode: LightweightCharts.CrosshairMode.Normal,
                },
                rightPriceScale: {
                    borderColor: '#333338',
                    scaleMargins: {
                        top: 0.1,
                        bottom: 0.1,
                    },
                },
                timeScale: {
                    borderColor: '#333338',
                    timeVisible: true,
                    secondsVisible: false,
                    fixLeftEdge: false,
                    fixRightEdge: false,
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
                priceLineVisible: true,
                lastValueVisible: true,
                priceLineColor: '#ffffff',
                priceLineWidth: 1,
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
        
    }
    
    addTestSignals() {
        if (!this.candlestickSeries) return;
        
        // 現在のデータ範囲からいくつかのポイントを選んでサインを配置
        const data = this.dataCache.get(this.currentTimeframe);
        if (!data || data.length < 10) return;
        
        // 複数マーカーを重ね合わせて発光効果を作成
        const testMarkers = [];
        const positions = [
            { ratio: 0.2, type: 'buy' },
            { ratio: 0.5, type: 'sell' }, 
            { ratio: 0.8, type: 'buy' }
        ];
        
        positions.forEach(pos => {
            const time = data[Math.floor(data.length * pos.ratio)].time;
            const isBuy = pos.type === 'buy';
            
            // グロー効果用の大きなマーカー（薄い色）
            testMarkers.push({
                time: time,
                position: isBuy ? 'belowBar' : 'aboveBar',
                color: isBuy ? 'rgba(0, 255, 255, 0.3)' : 'rgba(255, 20, 147, 0.3)',
                shape: isBuy ? 'arrowUp' : 'arrowDown',
                size: 5
            });
        });
        
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
        // データ範囲内で論理的なサインを生成
        const now = new Date();
        const signals = [];
        
        // 1000本の1時間足データ範囲を6つのセグメントに分割
        const dataStartTime = now.getTime() - (1000 * 60 * 60 * 1000); // 1000時間前
        const segmentDuration = (1000 * 60 * 60 * 1000) / 6; // 6つのサインに分割
        
        // 買いと売りを交互に配置
        const signalTypes = ['buy', 'sell', 'buy', 'sell', 'buy', 'sell'];
        
        for (let i = 0; i < signalTypes.length; i++) {
            // 各セグメント内でランダムな位置を選択（重複を避ける）
            const segmentStart = dataStartTime + (i * segmentDuration);
            const segmentEnd = segmentStart + segmentDuration;
            const randomOffset = Math.random() * (segmentDuration * 0.8) + (segmentDuration * 0.1); // セグメントの中央80%の範囲
            const timestamp = Math.floor((segmentStart + randomOffset) / 1000);
            
            const signalType = signalTypes[i];
            const basePrice = 45000 + (Math.random() - 0.5) * 6000;
            
            signals.push({
                id: `signal_${i}_${timestamp}`,
                timestamp: timestamp,
                type: signalType,
                price: Math.round(basePrice),
                reason: this.generateSignalReason(signalType),
                confidence: Math.round((Math.random() * 20 + 80)) // 80-100%の信頼度
            });
        }
        
        // タイムスタンプでソート（念のため）
        this.masterSignals = signals.sort((a, b) => a.timestamp - b.timestamp);
        console.log('Master signals generated:', this.masterSignals.length, 'signals');
        console.log('Signal sequence:', this.masterSignals.map(s => s.type).join(' -> '));
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
        
        // 現在の時刻から1000本のデータ範囲を計算
        const now = Math.floor(Date.now() / 1000);
        const dataStartTime = now - (1000 * intervalSeconds);
        
        for (const signal of this.masterSignals) {
            // サインのタイムスタンプをこの時間足の開始時刻に調整
            const adjustedTime = Math.floor(signal.timestamp / intervalSeconds) * intervalSeconds;
            
            // チャートの表示範囲内かどうかをチェック
            if (adjustedTime >= dataStartTime && adjustedTime <= now) {
                const isBuy = signal.type === 'buy';
                
                // グロー効果用の大きなマーカー（薄い色）
                markers.push({
                    time: adjustedTime,
                    position: isBuy ? 'belowBar' : 'aboveBar',
                    color: isBuy ? 'rgba(0, 255, 255, 0.3)' : 'rgba(255, 20, 147, 0.3)',
                    shape: isBuy ? 'arrowUp' : 'arrowDown',
                    size: 5
                });
            }
        }
        
        console.log(`Signals in visible range for ${timeframe}:`, markers.length, 'out of', this.masterSignals.length);
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