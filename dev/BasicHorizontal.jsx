import React from 'react';
import { SplitPane } from '../src';

export default () => {
  return (
    <SplitPane split="horizontal">
      <div>default min: 50px</div>
      <div />
    </SplitPane>
  );
};
