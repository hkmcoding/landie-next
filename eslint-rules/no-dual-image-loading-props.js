/**
 * @fileoverview Rule to prevent using both priority and loading props on Next.js Image components
 * @author Landie Team
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow using both priority and loading props on Next.js Image components',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
    messages: {
      dualProps: 'Cannot use both "priority" and "loading" props on Image component. Use either priority={true} for above-fold images or loading="lazy" for below-fold images.',
    },
  },

  create(context) {
    return {
      JSXElement(node) {
        if (node.openingElement.name.name !== 'Image') return;

        const attributes = node.openingElement.attributes;
        let hasPriority = false;
        let hasLoading = false;

        attributes.forEach(attr => {
          if (attr.type === 'JSXAttribute') {
            if (attr.name.name === 'priority') {
              hasPriority = true;
            }
            if (attr.name.name === 'loading') {
              hasLoading = true;
            }
          }
        });

        if (hasPriority && hasLoading) {
          context.report({
            node,
            messageId: 'dualProps',
            fix(fixer) {
              // Auto-fix: remove loading prop when priority is present
              const loadingAttr = attributes.find(attr => 
                attr.type === 'JSXAttribute' && attr.name.name === 'loading'
              );
              if (loadingAttr) {
                return fixer.remove(loadingAttr);
              }
            },
          });
        }
      },
    };
  },
};