import { render } from 'preact';
import './popup.css';

function Popup() {
  return (
    <div className="container">
      <h1>Fair Store</h1>
      <p>Welcome to Fair Store extension! 🎉</p>
    </div>
  );
}

render(<Popup />, document.getElementById('root')!);









