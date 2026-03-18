import { Document, Page, Text, View, StyleSheet, renderToBuffer, Font } from '@react-pdf/renderer';
import React from 'react';

// Optional: Register a custom font (like Inter or Roboto) if needed later
// Font.register({ family: 'Inter', src: '...' });

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerEmail: string;
  planName: string;
  amount: number;
  paymentId: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#334155',
  },
  headerBanner: {
    backgroundColor: '#f8fafc',
    padding: 20,
    marginBottom: 30,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #e2e8f0',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0ea5e9',
  },
  logoSub: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  invoiceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'right',
  },
  invoiceSub: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'right',
  },
  section: {
    marginBottom: 30,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  colGroup: {
    flexDirection: 'column',
  },
  label: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 10,
    color: '#0f172a',
  },
  table: {
    width: '100%',
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid',
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  colDesc: {
    flex: 3,
  },
  colQty: {
    flex: 1,
    textAlign: 'center',
  },
  colAmt: {
    flex: 1,
    textAlign: 'right',
  },
  descTitle: {
    fontWeight: 'bold',
    color: '#0f172a',
    fontSize: 11,
    marginBottom: 2,
  },
  descSub: {
    color: '#64748b',
    fontSize: 9,
  },
  totalsArea: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    borderTopStyle: 'solid',
    paddingTop: 16,
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
    width: 200,
  },
  totalsLabel: {
    flex: 1,
    textAlign: 'left',
    color: '#64748b',
  },
  totalsValue: {
    flex: 1,
    textAlign: 'right',
    color: '#0f172a',
  },
  totalsRowBold: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    width: 200,
  },
  totalsLabelBold: {
    flex: 1,
    textAlign: 'left',
    fontWeight: 'bold',
    fontSize: 12,
    color: '#0f172a',
  },
  totalsValueBold: {
    flex: 1,
    textAlign: 'right',
    fontWeight: 'bold',
    fontSize: 12,
    color: '#0f172a',
  },
  paidStamp: {
    backgroundColor: '#dcfce7',
    color: '#16a34a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    fontWeight: 'bold',
    fontSize: 10,
    alignSelf: 'flex-start',
    marginTop: -30,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 8,
  }
});

const InvoiceDocument = ({ data }: { data: InvoiceData }) => {
  const formattedDate = new Date(data.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  const safeDate = formattedDate !== "Invalid Date" ? formattedDate : data.date;

  const finalAmountString = `INR ${data.amount.toLocaleString("en-IN", { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header */}
        <View style={styles.headerBanner}>
          <View>
            <Text style={styles.logo}>CrawlMind</Text>
            <Text style={styles.logoSub}>crawl-mind.vercel.app</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>RECEIPT</Text>
            <Text style={styles.invoiceSub}>Invoice # {data.invoiceNumber}</Text>
          </View>
        </View>

        {/* Info Row */}
        <View style={styles.row}>
          <View style={styles.colGroup}>
            <Text style={styles.label}>Date Paid</Text>
            <Text style={styles.value}>{safeDate}</Text>
          </View>
          <View style={styles.colGroup}>
            <Text style={styles.label}>Payment Method</Text>
            <Text style={styles.value}>Razorpay ({data.paymentId})</Text>
          </View>
        </View>

        {/* Billed To */}
        <View style={styles.section}>
          <Text style={styles.label}>Billed To</Text>
          <Text style={[styles.value, { fontWeight: 'bold', fontSize: 12, marginBottom: 2 }]}>{data.customerName}</Text>
          <Text style={{ fontSize: 10, color: '#64748b' }}>{data.customerEmail}</Text>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.label, styles.colDesc]}>Description</Text>
            <Text style={[styles.label, styles.colQty]}>Qty</Text>
            <Text style={[styles.label, styles.colAmt]}>Amount</Text>
          </View>
          
          <View style={styles.tableRow}>
            <View style={styles.colDesc}>
              <Text style={styles.descTitle}>CrawlMind {data.planName} Subscription</Text>
              <Text style={styles.descSub}>Auto-renewing monthly plan</Text>
            </View>
            <Text style={styles.colQty}>1</Text>
            <Text style={styles.colAmt}>{finalAmountString}</Text>
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsArea}>
          <View style={styles.paidStamp}>
            <Text>PAID</Text>
          </View>
          
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{finalAmountString}</Text>
          </View>
          
          <View style={styles.totalsRowBold}>
            <Text style={styles.totalsLabelBold}>Amount Paid</Text>
            <Text style={styles.totalsValueBold}>{finalAmountString}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>If you have any questions, please contact us at support@crawl-mind.vercel.app</Text>
        </View>

      </Page>
    </Document>
  );
};

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  const buffer = await renderToBuffer(<InvoiceDocument data={data} />);
  return buffer;
}
