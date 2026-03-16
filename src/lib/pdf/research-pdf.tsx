import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
    lineHeight: 1.6,
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    paddingBottom: 16,
  },
  brand: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9,
    color: '#666',
  },
  date: {
    fontSize: 9,
    color: '#999',
    marginTop: 2,
  },
  h1: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 20,
    marginBottom: 8,
  },
  h2: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  paragraph: {
    fontSize: 10,
    color: '#333',
    marginBottom: 8,
    lineHeight: 1.7,
  },
  listItem: {
    fontSize: 10,
    color: '#333',
    marginBottom: 4,
    paddingLeft: 12,
    lineHeight: 1.6,
  },
  footer: {
    position: 'absolute' as const,
    bottom: 32,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingTop: 8,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  footerText: {
    fontSize: 7,
    color: '#999',
  },
});

interface ResearchPDFProps {
  reportText: string;
  date: string;
}

export function ResearchPDF({ reportText, date }: ResearchPDFProps) {
  const lines = reportText.split('\n');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>WealthDelta</Text>
          <Text style={styles.subtitle}>Portfolio Research Report</Text>
          <Text style={styles.date}>{date}</Text>
        </View>

        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return <View key={i} style={{ height: 6 }} />;

          if (trimmed.startsWith('# ')) {
            return (
              <Text key={i} style={styles.h1}>
                {trimmed.replace('# ', '')}
              </Text>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <Text key={i} style={styles.h2}>
                {trimmed.replace('## ', '')}
              </Text>
            );
          }
          if (trimmed.startsWith('- ')) {
            return (
              <Text key={i} style={styles.listItem}>
                {'•  '}{trimmed.replace('- ', '').replace(/\*\*(.*?)\*\*/g, '$1')}
              </Text>
            );
          }
          return (
            <Text key={i} style={styles.paragraph}>
              {trimmed.replace(/\*\*(.*?)\*\*/g, '$1')}
            </Text>
          );
        })}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>WealthDelta — Confidential</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
