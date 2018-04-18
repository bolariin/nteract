// @flow
/* eslint-disable class-methods-use-this */
import * as React from "react";
import ReactDOM from "react-dom";

import { of } from "rxjs/observable/of";
import { fromEvent } from "rxjs/observable/fromEvent";
import type { Subscription } from "rxjs";
import { switchMap } from "rxjs/operators";

import { Map as ImmutableMap } from "immutable";

import { RichestMime } from "@nteract/display-area";

import { debounce, merge } from "lodash";

export type { EditorChange, Options };

import "monaco-editor/esm/vs/editor/browser/controller/coreCommands.js";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api.js";

function normalizeLineEndings(str) {
  if (!str) return str;
  return str.replace(/\r\n|\r/g, "\n");
}

export type MonacoEditorProps = {
  editorFocused: boolean,
  theme: string,
  channels: ?any,
  // TODO: We only check if this is idle, so the completion provider should only
  //       care about this when kernelStatus === idle _and_ we're the active cell
  //       could instead call it `canTriggerCompletion` and reduce our current re-renders
  kernelStatus: string,
  onChange: (value: string, change: EditorChange) => void,
  onFocusChange: ?(focused: boolean) => void,
  value: string,
  defaultValue?: string,
  options: Options
};

type MonacoEditorState = {
  isFocused: boolean
};

class MonacoEditor extends React.Component<
  MonacoEditorProps,
  MonacoEditorState
> {
  executeTab: (editor: Object) => void;
  keyupEventsSubscriber: Subscription;

  static defaultProps = {
    onChange: null,
    onFocusChange: null
  };

  constructor(props: MonacoEditorProps): void {
    super(props);
    this.state = { isFocused: true, tipElement: null };
  }

  componentWillMount() {
    (this: any).componentWillReceiveProps = debounce(
      this.componentWillReceiveProps,
      0
    );
  }

  componentDidMount(): void {
    const { editorFocused, kernelStatus, focusAbove, focusBelow } = this.props;
    window.MonacoEnvironment = {
      getWorkerUrl: function(moduleId, label) {
        return "./editor.worker.bundle.js";
      }
    };
    console.log(this);
    this.monaco = monaco.editor.create(this.monacoContainer, {
      value: this.props.value
    });
  }

  componentDidUpdate(prevProps: MonacoEditorProps): void {
    if (!this.monaco) return;
  }

  componentWillReceiveProps(nextProps: MonacoEditorProps) {
    console.log(nextProps);
    if (
      this.monaco &&
      nextProps.value !== undefined &&
      normalizeLineEndings(this.cm.getValue()) !==
        normalizeLineEndings(nextProps.value)
    ) {
      if (this.props.options.preserveScrollPosition) {
        var prevScrollPosition = this.cm.getScrollInfo();
        this.cm.setValue(nextProps.value);
        this.cm.scrollTo(prevScrollPosition.left, prevScrollPosition.top);
      } else {
        this.cm.setValue(nextProps.value);
      }
    }
    if (typeof nextProps.options === "object") {
      for (let optionName in nextProps.options) {
        if (
          nextProps.options.hasOwnProperty(optionName) &&
          this.props.options[optionName] === nextProps.options[optionName]
        ) {
          this.cm.setOption(optionName, nextProps.options[optionName]);
        }
      }
    }
  }

  componentWillUnmount() {
    // TODO: is there a lighter weight way to remove the codemirror instance?
    if (this.cm) {
      this.cm.toTextArea();
    }
    this.keyupEventsSubscriber.unsubscribe();
  }

  focusChanged(focused: boolean) {
    this.setState({
      isFocused: focused
    });
    this.props.onFocusChange && this.props.onFocusChange(focused);
  }

  render(): React$Element<any> {
    return (
      <div
        className="monaco cm-s-composition"
        ref={container => {
          this.monacoContainer = container;
        }}
      />
    );
  }
}

export default MonacoEditor;
