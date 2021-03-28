const path = require('path');
const HtmlWebpackPlugin = require("html-webpack-plugin");
// Extracts CSS into separate files, creating one CSS file for each JS file that
// contains CSS. Supports On-Demand-Loading of CSS and SourceMaps.
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
	entry: './index.ts',
	output: {
		filename: 'index.js',
		path: path.resolve(__dirname, '../docs'),
	},
	devtool: 'inline-source-map',
	mode: "development",
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
			{
				test: /\.css$/i,
				use: [MiniCssExtractPlugin.loader, "css-loader"]
			},
			{
				test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
				use: {
					loader: "url-loader",
					options: {
						limit: 10 * 1024,
						name: `fonts/[name]--[folder].[ext]`
					}
				}
			},
		],
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js'],
		modules: [path.resolve(__dirname, 'node_modules')],
		alias: {
			"@benrbray/prosemirror-math" : "../"
		}
	},
	plugins : [new MiniCssExtractPlugin(), new HtmlWebpackPlugin({ template : "./index.html"})],
	watchOptions: {
		ignored: '**/node_modules',
	},
};