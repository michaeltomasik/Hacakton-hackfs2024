from fpdf import FPDF

class PDF(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 12)
        self.cell(0, 10, 'Health Insurance Claim Form', 0, 1, 'C')
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, 'Page %s' % self.page_no(), 0, 0, 'C')

    def chapter_title(self, title):
        self.set_font('Arial', 'B', 12)
        self.cell(0, 10, title, 0, 1, 'L')
        self.ln(5)

    def chapter_body(self, body):
        self.set_font('Arial', '', 12)
        self.multi_cell(0, 10, body)
        self.ln()

    def add_section(self, title, body):
        self.add_page()
        self.chapter_title(title)
        self.chapter_body(body)

# Create instance of FPDF class
pdf = PDF()

# Add a page
pdf.add_page()

# Set title
pdf.set_font('Arial', 'B', 16)
pdf.cell(0, 10, 'Insurance Claim Form', 0, 1, 'C')

# Add fake patient data
patient_data = [
    ('Name:', 'John Doe'),
    ('Date of Birth:', '01/15/1980'),
    ('Address:', '123 Fake Street, Faketown, FK 12345'),
    ('Phone Number:', '(123) 456-7890'),
    ('Email:', 'johndoe@example.com'),
    ('Insurance Policy Number:', 'XYZ123456789'),
    ('Group Number:', 'GRP123456'),
    ('Employer:', 'Fake Company Inc.'),
    ('Date of Service:', '05/01/2024'),
    ('Diagnosis:', 'Acute Pharyngitis'),
    ('Procedure:', 'Throat Examination'),
    ('History of Diseases:', 'Hypertension, Diabetes'),
    ('Current Health Issues:', 'Sore throat, Fever'),
    ('Family Status:', 'Married, 2 children'),
    ('Medications:', 'Metformin, Lisinopril'),
    ('Allergies:', 'Penicillin'),
]

pdf.set_font('Arial', '', 12)
for item in patient_data:
    pdf.cell(50, 10, item[0], 0, 0)
    pdf.cell(0, 10, item[1], 0, 1)

# Save the PDF
pdf_file_path = "./insurance_claim_form.pdf"
pdf.output(pdf_file_path)

print(f"PDF created: {pdf_file_path}")
