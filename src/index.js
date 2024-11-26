import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './boq';
import reportWebVitals from './reportWebVitals';
import DataTable from './DataTable';
import EditProduct from './EditProduct';
import Categories from './Categories'; // Import the Categories component
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <Routes>
      {/* Default route: Shows the data table */}
      <Route path="/" element={<Categories />} />

      {/* Route to edit a product */}
      <Route path="/edit/:id" element={<EditProduct />} />

      {/* Route to add a new product */}
      <Route path="/add" element={<App />} />

      <Route path="/datatable" element={<DataTable />} />


      {/* Route to manage categories */}
      <Route path="/categories" element={<Categories />} />
    </Routes>
  </BrowserRouter>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
