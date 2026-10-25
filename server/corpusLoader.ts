import fs from 'fs';
import path from 'path';
import { TechnicalDocument, TechnicalSection, TextChunk } from './types.js';

export class CorpusLoader {
  private documents: TechnicalDocument[] = [];
  private chunks: TextChunk[] = [];

  constructor(filePath?: string) {
    if (filePath) {
      this.loadFile(filePath);
    }
  }

  public loadFile(filePath: string) {
    if (!fs.existsSync(filePath)) {
      console.warn(`File ${filePath} not found, initializing with defaults`);
      return;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    this.loadFromText(content);
  }

  public loadFromText(rawText: string) {
    this.documents = [];
    this.chunks = [];

    // Split by DOCUMENT_ID:
    const docBlocks = rawText.split(/(?=DOCUMENT_ID:\s*)/g);

    for (const block of docBlocks) {
      const trimmed = block.trim();
      if (!trimmed) continue;

      const docIdMatch = trimmed.match(/DOCUMENT_ID:\s*([^\r\n]+)/);
      const titleMatch = trimmed.match(/TITLE:\s*([^\r\n]+)/);

      const docId = docIdMatch ? docIdMatch[1].trim() : 'NASA-MARS-DOC';
      const docTitle = titleMatch ? titleMatch[1].trim() : 'NASA Mars Mission Technical Report';

      // Split sections by "SECTION: "
      const sectionBlocks = trimmed.split(/(?=SECTION:\s*)/g);
      const sections: TechnicalSection[] = [];

      for (const sBlock of sectionBlocks) {
        const sTrimmed = sBlock.trim();
        if (!sTrimmed || sTrimmed.startsWith('DOCUMENT_ID:')) continue;

        const sectionMatch = sTrimmed.match(/SECTION:\s*([0-9\.]+)\s+([^\r\n]+)/);
        let sectionNumber = '1.0';
        let sectionName = 'Technical Details';
        let sectionContent = sTrimmed;

        if (sectionMatch) {
          sectionNumber = sectionMatch[1].trim();
          sectionName = sectionMatch[2].trim();
          // Remove the SECTION line from the content
          sectionContent = sTrimmed.replace(/SECTION:[^\r\n]+[\r\n]*/, '').trim();
        }

        const sectionId = `${docId}::SEC_${sectionNumber}`;
        const section: TechnicalSection = {
          id: sectionId,
          documentId: docId,
          title: docTitle,
          sectionNumber,
          sectionName,
          content: sectionContent,
        };

        sections.push(section);

        // Create Text Chunk
        const chunkId = `chunk_${this.chunks.length + 1}`;
        this.chunks.push({
          id: chunkId,
          documentId: docId,
          sectionId,
          sectionHeader: `SECTION: ${sectionNumber} ${sectionName} (${docId})`,
          content: sectionContent,
          tokens: [],
          length: sectionContent.split(/\s+/).length,
        });
      }

      this.documents.push({
        id: docId,
        documentId: docId,
        title: docTitle,
        sections,
      });
    }
  }

  public getDocuments(): TechnicalDocument[] {
    return this.documents;
  }

  public getChunks(): TextChunk[] {
    return this.chunks;
  }

  public addChunk(documentId: string, sectionNumber: string, sectionName: string, content: string) {
    const sectionHeader = `SECTION: ${sectionNumber} ${sectionName} (${documentId})`;
    const chunkId = `chunk_${this.chunks.length + 1}`;
    const chunk: TextChunk = {
      id: chunkId,
      documentId,
      sectionId: `${documentId}::SEC_${sectionNumber}`,
      sectionHeader,
      content,
      tokens: [],
      length: content.split(/\s+/).length,
    };
    this.chunks.push(chunk);
    return chunk;
  }
}
