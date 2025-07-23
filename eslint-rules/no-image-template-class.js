/**
 * @fileoverview Rule to prevent string template className concatenation in Image components
 * @author Landie Team
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow string template className concatenation in Image components to prevent hydration mismatches',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
    messages: {
      templateClass: 'Use clsx() instead of template literals for Image className to prevent hydration mismatches. Template: "{{template}}"',
    },
  },

  create(context) {
    return {
      JSXElement(node) {
        // Check if this is an Image component
        if (node.openingElement.name.name !== 'Image') return;

        const attributes = node.openingElement.attributes;
        
        attributes.forEach(attr => {
          if (attr.type === 'JSXAttribute' && attr.name.name === 'className') {
            // Check if className uses template literal with variables
            if (attr.value?.type === 'JSXExpressionContainer') {
              const expression = attr.value.expression;
              
              // Check for template literals with expressions
              if (expression.type === 'TemplateLiteral' && expression.expressions.length > 0) {
                const templateValue = context.getSourceCode().getText(expression);
                
                context.report({
                  node: attr,
                  messageId: 'templateClass',
                  data: {
                    template: templateValue,
                  },
                  fix(fixer) {
                    // Auto-fix: suggest clsx usage
                    const classValue = templateValue.replace(/`([^`]*)`/, 'clsx("$1")');
                    return fixer.replaceText(expression, `clsx(${JSON.stringify(templateValue.slice(1, -1))})`);
                  },
                });
              }
            }
          }
        });
      },
    };
  },
};