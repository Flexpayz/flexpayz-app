import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import {BrowserRouter} from "react-router-dom";
import {FlexPayzThemeProvider} from "./theme";

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <FlexPayzThemeProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </FlexPayzThemeProvider>
);
