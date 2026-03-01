"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { EstimateData } from "@/lib/format-estimate";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    marginBottom: 20,
  },
  businessName: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#15803d",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 10,
    color: "#666",
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    color: "#333",
  },
  infoBlock: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 8,
    color: "#888",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoText: {
    fontSize: 10,
    marginBottom: 1,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    marginVertical: 12,
  },
  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  tableGroupRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: "#fafafa",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  colName: { flex: 3 },
  colQty: { width: 50, textAlign: "right" },
  colUnit: { width: 45, textAlign: "center" },
  colRate: { width: 60, textAlign: "right" },
  colTotal: { width: 70, textAlign: "right" },
  headerText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#666",
    textTransform: "uppercase" as const,
  },
  groupName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  subTaskName: {
    fontSize: 9,
    color: "#555",
  },
  // Summary
  summaryBlock: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: "#15803d",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 10,
    color: "#555",
  },
  summaryValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  totalValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#15803d",
  },
  // Footer
  footer: {
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  footerText: {
    fontSize: 8,
    color: "#888",
    marginBottom: 2,
  },
  signatureLine: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBlock: {
    width: "45%",
  },
  signatureLabel: {
    fontSize: 8,
    color: "#888",
    marginBottom: 4,
  },
  signatureDash: {
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    height: 20,
  },
});

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

export function EstimatePDF({ data, businessName, businessSubtitle }: { data: EstimateData; businessName?: string; businessSubtitle?: string }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.businessName}>{businessName ?? "Landscaping and Services"}</Text>
          <Text style={styles.subtitle}>
            {businessSubtitle ?? "Landscaping & Outdoor Services"}
          </Text>
        </View>

        {/* Date + Estimate Title */}
        <View style={styles.dateRow}>
          <View>
            <Text style={styles.sectionTitle}>Project Estimate</Text>
            <Text style={styles.infoText}>{data.projectName}</Text>
            {data.quoteNumber && (
              <Text style={{ fontSize: 9, color: "#888", marginTop: 2 }}>
                {data.quoteNumber}
              </Text>
            )}
          </View>
          <View style={{ alignItems: "flex-end" as const }}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoText}>{data.date}</Text>
          </View>
        </View>

        {/* Schedule dates */}
        {(data.startDate || data.estimatedCompletion) && (
          <View style={{ flexDirection: "row", marginBottom: 12, gap: 24 }}>
            {data.startDate && (
              <View>
                <Text style={styles.infoLabel}>Start Date</Text>
                <Text style={styles.infoText}>{data.startDate}</Text>
              </View>
            )}
            {data.estimatedCompletion && (
              <View>
                <Text style={styles.infoLabel}>Est. Completion</Text>
                <Text style={styles.infoText}>{data.estimatedCompletion}</Text>
              </View>
            )}
          </View>
        )}

        {/* Client + Project Info */}
        <View style={{ flexDirection: "row", marginBottom: 12 }}>
          {data.contactName && (
            <View style={[styles.infoBlock, { flex: 1 }]}>
              <Text style={styles.infoLabel}>Client</Text>
              <Text style={styles.infoText}>{data.contactName}</Text>
              {data.contactPhone && (
                <Text style={styles.infoText}>{data.contactPhone}</Text>
              )}
              {data.contactEmail && (
                <Text style={styles.infoText}>{data.contactEmail}</Text>
              )}
              {data.contactAddress && (
                <Text style={styles.infoText}>{data.contactAddress}</Text>
              )}
            </View>
          )}
          {data.projectAddress && (
            <View style={[styles.infoBlock, { flex: 1 }]}>
              <Text style={styles.infoLabel}>Project Site</Text>
              <Text style={styles.infoText}>{data.projectAddress}</Text>
            </View>
          )}
        </View>

        {data.projectDescription && (
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Description</Text>
            <Text style={styles.infoText}>{data.projectDescription}</Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Line Items Table */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, styles.colName]}>Item</Text>
          <Text style={[styles.headerText, styles.colQty]}>Qty</Text>
          <Text style={[styles.headerText, styles.colUnit]}>Unit</Text>
          <Text style={[styles.headerText, styles.colRate]}>Rate</Text>
          <Text style={[styles.headerText, styles.colTotal]}>Total</Text>
        </View>

        {data.lineItems.map((item, i) => {
          if (item.isGroup) {
            return (
              <View key={i} style={styles.tableGroupRow}>
                <Text
                  style={[
                    styles.groupName,
                    styles.colName,
                    { paddingLeft: item.depth * 12 },
                  ]}
                >
                  {item.name}
                </Text>
                <Text style={styles.colQty}></Text>
                <Text style={styles.colUnit}></Text>
                <Text style={styles.colRate}></Text>
                <Text
                  style={[
                    styles.colTotal,
                    { fontFamily: "Helvetica-Bold", fontSize: 10 },
                  ]}
                >
                  {formatMoney(item.lineTotal)}
                </Text>
              </View>
            );
          }
          return (
            <View key={i} style={styles.tableRow}>
              <Text
                style={[
                  styles.subTaskName,
                  styles.colName,
                  { paddingLeft: item.depth * 12 },
                ]}
              >
                {item.name}
              </Text>
              <Text style={[styles.subTaskName, styles.colQty]}>
                {item.quantity ?? ""}
              </Text>
              <Text style={[styles.subTaskName, styles.colUnit]}>
                {item.unit ?? ""}
              </Text>
              <Text style={[styles.subTaskName, styles.colRate]}>
                {item.unitCost != null ? formatMoney(item.unitCost) : ""}
              </Text>
              <Text style={[styles.subTaskName, styles.colTotal]}>
                {formatMoney(item.lineTotal)}
              </Text>
            </View>
          );
        })}

        {/* Summary */}
        <View style={styles.summaryBlock}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Estimated Hours</Text>
            <Text style={styles.summaryValue}>
              {data.summary.totalHours.toFixed(1)} hours
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Crew Size</Text>
            <Text style={styles.summaryValue}>
              {data.summary.maxManpower}{" "}
              {data.summary.maxManpower === 1 ? "person" : "people"}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Estimate</Text>
            <Text style={styles.totalValue}>
              {formatMoney(data.summary.totalCost)}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {data.projectNotes && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.infoLabel}>Notes</Text>
            <Text style={styles.infoText}>{data.projectNotes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This estimate is valid for 30 days from the date above.
          </Text>
          <Text style={styles.footerText}>
            Prices may vary based on site conditions and material availability.
          </Text>

          <View style={styles.signatureLine}>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>Client Signature</Text>
              <View style={styles.signatureDash} />
            </View>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>Date</Text>
              <View style={styles.signatureDash} />
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
