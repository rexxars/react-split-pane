import React from 'react';
import { SplitPane } from '../src';

const styles = {
  display: 'flex',
  height: '70%',
  width: '70%',
  border: '1px solid red',
};

export default () => (
  <React.Fragment>
    outer container
    <div style={styles}>
      <SplitPane defaultSize="40%" split="horizontal">
        <div>size: 40%</div>
        <div />
      </SplitPane>
    </div>
  </React.Fragment>
);
