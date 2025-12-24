import React from 'react';
import { ChromePicker } from 'react-color';
import styles from './MinimalChromePicker.module.css';

const MinimalChromePicker = ({ color, onChange, ...props }) => (
  <div className={styles.pickerWrapper}>
    <ChromePicker
      color={color}
      onChange={onChange}
      disableAlpha={false}
      className={styles.chromePicker}
      styles={{
        default: {
          picker: {
            boxShadow: 'none',
            borderRadius: 8,
            background: '#222',
            color: '#fff',
            padding: 0,
            width: 150,
            minWidth: 0
          },
          saturation: {
            borderRadius: 8,
            minHeight: 90,
            maxHeight: 90
          },
          controls: {
            display: 'flex',
            flexDirection: 'row',
            marginTop: 8
          }
        }
      }}
      {...props}
    />
  </div>
);

export default MinimalChromePicker; 