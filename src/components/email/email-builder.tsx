'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  Type, Image, Link as LinkIcon, Layout, Minus, 
  Trash2, Plus, Eye, Code, Save 
} from 'lucide-react';

interface EmailBlock {
  id: string;
  type: 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'html';
  content: Record<string, unknown>;
  styles?: Record<string, unknown>;
}

interface EmailTemplate {
  id?: string;
  name: string;
  subject: string;
  blocks: EmailBlock[];
}

interface EmailBuilderProps {
  template?: EmailTemplate;
  onSave: (template: EmailTemplate) => void;
  onCancel?: () => void;
}

const blockTypes = [
  { type: 'text', icon: Type, label: 'Text', defaultContent: { text: 'Enter your text here...' } },
  { type: 'image', icon: Image, label: 'Image', defaultContent: { url: '', alt: 'Image' } },
  { type: 'button', icon: LinkIcon, label: 'Button', defaultContent: { text: 'Click Here', url: '#' } },
  { type: 'divider', icon: Minus, label: 'Divider', defaultContent: {} },
  { type: 'spacer', icon: Layout, label: 'Spacer', defaultContent: { height: 20 } },
  { type: 'html', icon: Code, label: 'HTML', defaultContent: { html: '<div>Custom HTML</div>' } },
];

export function EmailBuilder({ template, onSave, onCancel }: EmailBuilderProps) {
  const [templateData, setTemplateData] = useState<EmailTemplate>(
    template || {
      name: '',
      subject: '',
      blocks: []
    }
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const addBlock = useCallback((blockType: typeof blockTypes[0]) => {
    const newBlock: EmailBlock = {
      id: `block-${Date.now()}`,
      type: blockType.type as EmailBlock['type'],
      content: { ...blockType.defaultContent }
    };

    setTemplateData(prev => ({
      ...prev,
      blocks: [...prev.blocks, newBlock]
    }));
    setSelectedBlockId(newBlock.id);
  }, []);

  const updateBlock = useCallback((blockId: string, updates: Partial<EmailBlock>) => {
    setTemplateData(prev => ({
      ...prev,
      blocks: prev.blocks.map(block =>
        block.id === blockId ? { ...block, ...updates } : block
      )
    }));
  }, []);

  const deleteBlock = useCallback((blockId: string) => {
    setTemplateData(prev => ({
      ...prev,
      blocks: prev.blocks.filter(block => block.id !== blockId)
    }));
    setSelectedBlockId(null);
  }, []);

  const moveBlock = useCallback((fromIndex: number, toIndex: number) => {
    setTemplateData(prev => {
      const newBlocks = [...prev.blocks];
      const [movedBlock] = newBlocks.splice(fromIndex, 1);
      newBlocks.splice(toIndex, 0, movedBlock);
      return { ...prev, blocks: newBlocks };
    });
  }, []);

  const handleSave = () => {
    onSave(templateData);
  };

  const renderBlockContent = (block: EmailBlock, isPreview = false) => {
    switch (block.type) {
      case 'text':
        return isPreview ? (
          <div 
            dangerouslySetInnerHTML={{ __html: block.content.text as string || '' }}
            className="prose prose-sm max-w-none"
          />
        ) : (
          <textarea
            value={block.content.text as string || ''}
            onChange={(e) => updateBlock(block.id, { content: { ...block.content, text: e.target.value } })}
            className="w-full min-h-[100px] p-3 border border-line rounded-lg bg-surface"
            placeholder="Enter your text..."
          />
        );

      case 'image':
        return isPreview ? (
          <img 
            src={block.content.url as string || 'https://via.placeholder.com/600x300'} 
            alt={block.content.alt as string || 'Image'}
            className="max-w-full h-auto rounded-lg"
          />
        ) : (
          <div className="space-y-2">
            <Input
              type="url"
              value={block.content.url as string || ''}
              onChange={(e) => updateBlock(block.id, { content: { ...block.content, url: e.target.value } })}
              placeholder="Image URL"
            />
            <Input
              value={block.content.alt as string || ''}
              onChange={(e) => updateBlock(block.id, { content: { ...block.content, alt: e.target.value } })}
              placeholder="Alt text"
            />
          </div>
        );

      case 'button':
        return isPreview ? (
          <a
            href={block.content.url as string || '#'}
            className="inline-block px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            {block.content.text as string || 'Click Here'}
          </a>
        ) : (
          <div className="space-y-2">
            <Input
              value={block.content.text as string || ''}
              onChange={(e) => updateBlock(block.id, { content: { ...block.content, text: e.target.value } })}
              placeholder="Button text"
            />
            <Input
              type="url"
              value={block.content.url as string || ''}
              onChange={(e) => updateBlock(block.id, { content: { ...block.content, url: e.target.value } })}
              placeholder="Button URL"
            />
          </div>
        );

      case 'divider':
        return <hr className="border-t border-line my-4" />;

      case 'spacer':
        return <div style={{ height: `${block.content.height as number || 20}px` }} />;

      case 'html':
        return isPreview ? (
          <div dangerouslySetInnerHTML={{ __html: block.content.html as string || '' }} />
        ) : (
          <textarea
            value={block.content.html as string || ''}
            onChange={(e) => updateBlock(block.id, { content: { ...block.content, html: e.target.value } })}
            className="w-full min-h-[150px] p-3 border border-line rounded-lg bg-surface font-mono text-sm"
            placeholder="Enter custom HTML..."
          />
        );

      default:
        return null;
    }
  };

  const generateEmailHTML = () => {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${templateData.subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; }
          .block { padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background: #1E6F5C; color: #fff; text-decoration: none; border-radius: 4px; }
          img { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>
        <div class="container">
    `;

    templateData.blocks.forEach(block => {
      html += '<div class="block">';
      switch (block.type) {
        case 'text':
          html += `<div>${block.content.text || ''}</div>`;
          break;
        case 'image':
          html += `<img src="${block.content.url || ''}" alt="${block.content.alt || ''}" />`;
          break;
        case 'button':
          html += `<a href="${block.content.url || '#'}" class="button">${block.content.text || 'Click Here'}</a>`;
          break;
        case 'divider':
          html += '<hr />';
          break;
        case 'spacer':
          html += `<div style="height: ${block.content.height || 20}px;"></div>`;
          break;
        case 'html':
          html += block.content.html || '';
          break;
      }
      html += '</div>';
    });

    html += `
        </div>
      </body>
      </html>
    `;

    return html;
  };

  return (
    <div className="flex h-screen bg-canvas">
      {/* Sidebar - Block Types */}
      <div className="w-64 bg-surface border-r border-line p-4 overflow-y-auto">
        <h3 className="font-semibold text-ink mb-4">Blocks</h3>
        <div className="space-y-2">
          {blockTypes.map(blockType => (
            <Button
              key={blockType.type}
              variant="outline"
              className="w-full justify-start"
              onClick={() => addBlock(blockType)}
            >
              <blockType.icon className="w-4 h-4 mr-2" />
              {blockType.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-surface border-b border-line p-4 flex items-center justify-between">
          <div className="flex-1 flex gap-4">
            <Input
              value={templateData.name}
              onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Template name"
              className="max-w-xs"
            />
            <Input
              value={templateData.subject}
              onChange={(e) => setTemplateData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Email subject"
              className="flex-1"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Eye className="w-4 h-4 mr-2" />
              {previewMode ? 'Edit' : 'Preview'}
            </Button>
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        {/* Editor/Preview Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto">
            {previewMode ? (
              <Card className="p-8 bg-white">
                <div dangerouslySetInnerHTML={{ __html: generateEmailHTML() }} />
              </Card>
            ) : (
              <div className="space-y-4">
                {templateData.blocks.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-line rounded-lg">
                    <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Start building your email</p>
                    <p className="text-sm">Drag blocks from the sidebar or click to add</p>
                  </div>
                ) : (
                  templateData.blocks.map((block, index) => (
                    <Card
                      key={block.id}
                      className={`p-4 transition-all ${
                        selectedBlockId === block.id
                          ? 'ring-2 ring-accent'
                          : 'hover:ring-1 hover:ring-line'
                      }`}
                      onClick={() => setSelectedBlockId(block.id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground uppercase">
                            {block.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (index > 0) moveBlock(index, index - 1);
                            }}
                            disabled={index === 0}
                          >
                            ↑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (index < templateData.blocks.length - 1) moveBlock(index, index + 1);
                            }}
                            disabled={index === templateData.blocks.length - 1}
                          >
                            ↓
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteBlock(block.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {renderBlockContent(block)}
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Block Settings Panel */}
      {selectedBlockId && !previewMode && (
        <div className="w-80 bg-surface border-l border-line p-4 overflow-y-auto">
          <h3 className="font-semibold text-ink mb-4">Block Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Block Type</label>
              <p className="text-sm text-ink capitalize">
                {templateData.blocks.find(b => b.id === selectedBlockId)?.type}
              </p>
            </div>
            {/* Additional block-specific settings can be added here */}
          </div>
        </div>
      )}
    </div>
  );
}