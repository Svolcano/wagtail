import { initCommentsApp } from 'wagtail-comment-frontend';
import { STRINGS } from '../../config/wagtailConfig';

function initComments(author, initialComments) {
  // in case any widgets try to initialise themselves before the comment app,
  // store their initialisations as callbacks to be executed when the comment app
  // itself is finished initialising.
  const callbacks = [];
  window.commentApp = {
    registerWidget: (widget) => {
      callbacks.push(() => { window.commentApp.registerWidget(widget); });
    }
  };
  document.addEventListener('DOMContentLoaded', () => {
    const commentsElement = document.getElementById('comments');
    if (commentsElement) {
      window.commentApp = initCommentsApp(commentsElement, author, initialComments, STRINGS);
      callbacks.forEach((callback) => { callback(); });
    }
  });
}

function getContentPath(fieldNode) {
  // Return the total contentpath for an element as a string, in the form field.streamfield_uid.block...
  if (fieldNode.closest('data-contentpath-disabled')) {
    return '';
  }
  let element = fieldNode.closest('[data-contentpath]');
  const contentPaths = [];
  while (element !== null) {
    contentPaths.push(element.dataset.contentpath);
    element = element.parentElement.closest('[data-contentpath]');
  }
  contentPaths.reverse();
  return contentPaths.join('.');
}

class BasicFieldLevelAnnotation {
  constructor(fieldNode, node) {
    this.node = node;
    this.fieldNode = fieldNode;
    this.position = '';
  }
  onDelete() {
    this.node.remove();
  }
  onFocus() {
    this.node.classList.remove('button-secondary');
    this.node.ariaLabel = STRINGS.UNFOCUS_COMMENT;
  }
  onUnfocus() {
    this.node.classList.add('button-secondary');
    this.node.ariaLabel = STRINGS.UNFOCUS_COMMENT;
    // TODO: ensure comment is focused accessibly when this is clicked,
    // and that screenreader users can return to the annotation point when desired
  }
  show() {
    this.node.classList.remove('u-hidden');
  }
  hide() {
    this.node.classList.add('u-hidden');
  }
  setOnClickHandler(handler) {
    this.node.addEventListener('click', handler);
  }
  getDesiredPosition() {
    return (
      this.fieldNode.getBoundingClientRect().top +
      document.documentElement.scrollTop
    );
  }
}

class FieldLevelCommentWidget {
  constructor(
    fieldNode,
    commentAdditionNode,
    annotationTemplateNode
  ) {
    this.fieldNode = fieldNode;
    this.contentPath = getContentPath(fieldNode);
    this.commentAdditionNode = commentAdditionNode;
    this.annotationTemplateNode = annotationTemplateNode;
    this.commentNumber = 0;
    this.commentsEnabled = false;
  }
  onRegister(makeComment) {
    this.commentAdditionNode.addEventListener('click', () => {
      makeComment(this.getAnnotationForComment(), this.contentPath);
    });
  }
  setEnabled(enabled) {
    // Update whether comments are enabled for the page
    this.commentsEnabled = enabled;
    this.updateVisibility();
  }
  onChangeComments(comments) {
    // Receives a list of comments for the widget's contentpath
    this.commentNumber = comments.length;
    this.updateVisibility();
  }
  updateVisibility() {
    // if comments are disabled, or the widget already has at least one associated comment,
    // don't show the comment addition button
    if (!this.commentsEnabled || this.commentNumber > 0) {
      this.commentAdditionNode.classList.add('u-hidden');
    } else {
      this.commentAdditionNode.classList.remove('u-hidden');
    }
  }
  getAnnotationForComment() {
    const annotationNode = this.annotationTemplateNode.cloneNode(true);
    annotationNode.id = '';
    this.commentAdditionNode.insertAdjacentElement('afterend', annotationNode);
    return new BasicFieldLevelAnnotation(this.fieldNode, annotationNode);
  }
}

function initFieldLevelCommentWidget(fieldElement) {
  const widget = new FieldLevelCommentWidget(
    fieldElement,
    fieldElement.querySelector('[data-comment-add]'),
    document.querySelector('#comment-icon')
  );
  if (widget.contentPath) {
    window.commentApp.registerWidget(widget);
  }
}

export default {
  initComments,
  FieldLevelCommentWidget,
  initFieldLevelCommentWidget
};
