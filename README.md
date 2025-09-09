# Portfolio Dashboard

A modern, interactive portfolio and net worth tracking dashboard built with HTML, CSS, and JavaScript.

## Features

- **Interactive Pie Chart**: Visual representation of your portfolio allocation using Chart.js
- **Multiple Asset Categories**: 
  - Stocks
  - Roth IRA
  - Checking Accounts
  - Savings Accounts
  - Cryptocurrency
  - Real Estate
  - Vehicles
  - Other Assets
- **Real-time Price Updates**: Automatic price fetching for stocks and cryptocurrency with live market data
- **Category Management**: Click on any category to view and manage individual assets within that category
- **Asset Sorting**: All assets are automatically sorted by value (highest to lowest) in both category views and the summary section
- **Dark Mode**: Modern dark theme for comfortable viewing
- **All Assets Summary**: Complete overview of all assets across all categories, sorted by value
- **Local Storage**: Your data is saved locally in your browser
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Modern UI**: Clean, professional design with smooth animations

## How to Use

1. **Open the Dashboard**: Simply open `index.html` in your web browser
2. **Add Assets**: Click the "+ Add" button on any asset category card
3. **Choose Input Type**: For stocks and crypto, you can either:
   - Enter a ticker symbol and quantity (auto-updates with live prices)
   - Enter a static value
4. **View Category Details**: Click on any category card to see individual assets within that category
5. **View All Assets**: Scroll down to see the "All Assets Summary" section with all assets sorted by value
6. **Real-time Updates**: Stock and crypto prices automatically update every 5 minutes

## Getting Started

1. Download all files to a folder on your computer
2. Open `index.html` in your web browser
3. The dashboard starts with all categories at $0 - no sample data
4. Start adding your own assets by clicking the "+ Add" buttons
5. For stocks and crypto, you can enter ticker symbols and quantities for automatic price updates

## Data Storage

- All your portfolio data is stored locally in your browser's localStorage
- Your data persists between browser sessions
- No data is sent to external servers

## Customization

You can easily customize the dashboard by:

- **Adding New Categories**: Edit the `portfolio` object in `script.js`
- **Changing Colors**: Modify the color scheme in `styles.css`
- **Adding Features**: Extend the JavaScript functionality

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## File Structure

```
portfolio-dashboard/
├── index.html          # Main HTML file
├── styles.css          # CSS styling
├── script.js           # JavaScript functionality
└── README.md           # This file
```

## Future Enhancements

Potential features to add:
- Asset performance tracking
- Historical data visualization
- Export/import functionality
- Goal setting and tracking
- Investment recommendations
- Real-time stock prices (with API integration)

## Support

This is a personal project. Feel free to modify and enhance it for your own use!

## License

This project is open source and available under the MIT License. 