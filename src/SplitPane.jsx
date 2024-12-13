/* global document, window */
import React from 'react';

import { Pane } from './Pane';
import { Resizer, RESIZER_DEFAULT_CLASSNAME } from './Resizer';

function unFocus(document, window) {
  if (document.selection) {
    document.selection.empty();
  } else {
    try {
      window.getSelection().removeAllRanges();
    } catch (e) {}
  }
}

function getDefaultSize(defaultSize, minSize, maxSize, draggedSize) {
  if (typeof draggedSize === 'number') {
    const min = typeof minSize === 'number' ? minSize : 0;
    const max =
      typeof maxSize === 'number' && maxSize >= 0 ? maxSize : Infinity;
    return Math.max(min, Math.min(max, draggedSize));
  }
  if (defaultSize !== undefined) {
    return defaultSize;
  }
  return minSize;
}

function removeNullChildren(children) {
  return React.Children.toArray(children).filter((c) => c);
}
export class SplitPane extends React.Component {
  constructor(props) {
    super(props);

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);

    // order of setting panel sizes.
    // 1. size
    // 2. getDefaultSize(defaultSize, minsize, maxSize)

    const { size, defaultSize, minSize, maxSize, primary } = props;

    const initialSize =
      size !== undefined
        ? size
        : getDefaultSize(defaultSize, minSize, maxSize, null);

    this.state = {
      active: false,
      resized: false,
      pane1Size: primary === 'first' ? initialSize : undefined,
      pane2Size: primary === 'second' ? initialSize : undefined,

      // these are props that are needed in static functions. ie: gDSFP
      instanceProps: {
        size,
      },
    };
  }

  componentDidMount() {
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('touchmove', this.onTouchMove);
    this.setState(SplitPane.getSizeUpdate(this.props, this.state));
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    return SplitPane.getSizeUpdate(nextProps, prevState);
  }

  componentWillUnmount() {
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('touchmove', this.onTouchMove);
  }

  onMouseDown(event) {
    const eventWithTouches = Object.assign({}, event, {
      touches: [{ clientX: event.clientX, clientY: event.clientY }],
    });
    this.onTouchStart(eventWithTouches);
  }

  onTouchStart(event) {
    const { allowResize, onDragStarted, split } = this.props;
    if (allowResize) {
      unFocus(document, window);
      const position =
        split === 'vertical'
          ? event.touches[0].clientX
          : event.touches[0].clientY;

      if (typeof onDragStarted === 'function') {
        onDragStarted();
      }
      this.setState({
        active: true,
        position,
      });
    }
  }

  onMouseMove(event) {
    const eventWithTouches = Object.assign({}, event, {
      touches: [{ clientX: event.clientX, clientY: event.clientY }],
    });
    this.onTouchMove(eventWithTouches);
  }

  onTouchMove(event) {
    if (!this.state.active || !this.props.allowResize) {
      return;
    }

    const { maxSize, minSize, onChange, split, step } = this.props;
    const { position } = this.state;

    unFocus(document, window);
    const isPrimaryFirst = this.props.primary === 'first';
    const ref = isPrimaryFirst ? this.pane1 : this.pane2;
    const ref2 = isPrimaryFirst ? this.pane2 : this.pane1;

    if (!ref || !ref.getBoundingClientRect) {
      return;
    }

    const node = ref;
    const node2 = ref2;

    const width = node.getBoundingClientRect().width;
    const height = node.getBoundingClientRect().height;
    const current =
      split === 'vertical'
        ? event.touches[0].clientX
        : event.touches[0].clientY;
    const size = split === 'vertical' ? width : height;

    let positionDelta = position - current;
    if (step) {
      if (Math.abs(positionDelta) < step) {
        return;
      }
      // Integer division
      positionDelta = ~~(positionDelta / step) * step;
    }
    let sizeDelta = isPrimaryFirst ? positionDelta : -positionDelta;

    const pane1Order = parseInt(window.getComputedStyle(node).order);
    const pane2Order = parseInt(window.getComputedStyle(node2).order);
    if (pane1Order > pane2Order) {
      sizeDelta = -sizeDelta;
    }

    let newMaxSize = maxSize;
    if (maxSize !== undefined && maxSize <= 0) {
      const splitPane = this.splitPane;
      if (split === 'vertical') {
        newMaxSize = splitPane.getBoundingClientRect().width + maxSize;
      } else {
        newMaxSize = splitPane.getBoundingClientRect().height + maxSize;
      }
    }

    let newSize = size - sizeDelta;
    const newPosition = position - positionDelta;

    if (newSize < minSize) {
      newSize = minSize;
    } else if (maxSize !== undefined && newSize > newMaxSize) {
      newSize = newMaxSize;
    } else {
      this.setState({
        position: newPosition,
        resized: true,
      });
    }

    if (onChange) onChange(newSize);

    this.setState({
      draggedSize: newSize,
      [isPrimaryFirst ? 'pane1Size' : 'pane2Size']: newSize,
    });
  }

  onMouseUp() {
    if (!this.state.active || !this.props.allowResize) {
      return;
    }

    const { onDragFinished } = this.props;
    const { draggedSize } = this.state;

    if (typeof onDragFinished === 'function') {
      onDragFinished(draggedSize);
    }
    this.setState({ active: false });
  }

  // we have to check values since gDSFP is called on every render and more in StrictMode
  static getSizeUpdate(props, state) {
    const newState = {};
    const { instanceProps } = state;

    if (instanceProps.size === props.size && props.size !== undefined) {
      return {};
    }

    const newSize =
      props.size !== undefined
        ? props.size
        : getDefaultSize(
            props.defaultSize,
            props.minSize,
            props.maxSize,
            state.draggedSize
          );

    if (props.size !== undefined) {
      newState.draggedSize = newSize;
    }

    const isPanel1Primary = props.primary === 'first';

    newState[isPanel1Primary ? 'pane1Size' : 'pane2Size'] = newSize;
    newState[isPanel1Primary ? 'pane2Size' : 'pane1Size'] = undefined;

    newState.instanceProps = { size: props.size };

    return newState;
  }

  render() {
    const {
      allowResize,
      children,
      className,
      onResizerClick,
      onResizerDoubleClick,
      paneClassName,
      pane1ClassName,
      pane2ClassName,
      paneStyle,
      pane1Style: pane1StyleProps,
      pane2Style: pane2StyleProps,
      resizerClassName,
      resizerStyle,
      split,
      style: styleProps,
    } = this.props;

    const { pane1Size, pane2Size } = this.state;

    const disabledClass = allowResize ? '' : 'disabled';
    const resizerClassNamesIncludingDefault = resizerClassName
      ? `${resizerClassName} ${RESIZER_DEFAULT_CLASSNAME}`
      : resizerClassName;

    const notNullChildren = removeNullChildren(children);

    const style = {
      display: 'flex',
      flex: 1,
      height: '100%',
      position: 'absolute',
      outline: 'none',
      overflow: 'hidden',
      MozUserSelect: 'text',
      WebkitUserSelect: 'text',
      msUserSelect: 'text',
      userSelect: 'text',
      ...styleProps,
    };

    if (split === 'vertical') {
      Object.assign(style, {
        flexDirection: 'row',
        left: 0,
        right: 0,
      });
    } else {
      Object.assign(style, {
        bottom: 0,
        flexDirection: 'column',
        minHeight: '100%',
        top: 0,
        width: '100%',
      });
    }

    const classes = ['SplitPane', className, split, disabledClass];

    const pane1Style = { ...paneStyle, ...pane1StyleProps };
    const pane2Style = { ...paneStyle, ...pane2StyleProps };

    const pane1Classes = ['Pane1', paneClassName, pane1ClassName].join(' ');
    const pane2Classes = ['Pane2', paneClassName, pane2ClassName].join(' ');

    return (
      <div
        data-testid="split-pane"
        className={classes.join(' ')}
        ref={(node) => {
          this.splitPane = node;
        }}
        style={style}
      >
        <Pane
          className={pane1Classes}
          key="pane1"
          eleRef={(node) => {
            this.pane1 = node;
          }}
          size={pane1Size}
          split={split}
          style={pane1Style}
        >
          {notNullChildren[0]}
        </Pane>
        <Resizer
          className={disabledClass}
          onClick={onResizerClick}
          onDoubleClick={onResizerDoubleClick}
          onMouseDown={this.onMouseDown}
          onTouchStart={this.onTouchStart}
          onTouchEnd={this.onMouseUp}
          key="resizer"
          resizerClassName={resizerClassNamesIncludingDefault}
          split={split}
          style={resizerStyle || {}}
        />
        <Pane
          className={pane2Classes}
          key="pane2"
          eleRef={(node) => {
            this.pane2 = node;
          }}
          size={pane2Size}
          split={split}
          style={pane2Style}
        >
          {notNullChildren[1]}
        </Pane>
      </div>
    );
  }
}

SplitPane.defaultProps = {
  allowResize: true,
  minSize: 50,
  primary: 'first',
  split: 'vertical',
  paneClassName: '',
  pane1ClassName: '',
  pane2ClassName: '',
};
