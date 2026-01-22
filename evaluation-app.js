// ========== التهيئة والإعدادات ==========
class EvaluationApp {
  constructor() {
    this.state = {
      currentDepartment: '',
      currentEmployee: '',
      currentSupervisor: '',
      evaluationDate: '',
      ratings: {
        general: new Map(),
        department: new Map()
      },
      currentLanguage: 'ar',
      notes: {
        general: '',
        department: '',
        overall: ''
      },
      isLoading: false
    };

    this.elements = this.cacheElements();
    this.init();
  }

  cacheElements() {
    const elements = {};

    // Cache all elements by ID
    document.querySelectorAll('[id]').forEach(el => {
      elements[el.id] = el;
    });

    // Cache commonly used elements
    elements.departmentSelect = document.getElementById('departmentSelect');
    elements.employeeSelect = document.getElementById('employeeSelect');
    elements.supervisorSelect = document.getElementById('supervisorSelect');
    elements.evaluationDate = document.getElementById('evaluationDate');
    elements.generateBtn = document.getElementById('generateAndSend');
    elements.notification = document.getElementById('notification');
    elements.generalCriteriaBody = document.getElementById('generalCriteriaBody');
    elements.departmentCriteria = document.getElementById('departmentCriteria');

    return elements;
  }

  init() {
    // تعيين التاريخ الحالي
    this.setCurrentDate();

    // تعبئة المشرفين
    this.populateSupervisors();

    // عرض المعايير العامة
    this.renderGeneralCriteria();

    // إضافة مستمعي الأحداث
    this.bindEvents();

    // تهيئة العرض التقديمي
    this.initializeDemo();
  }

  setCurrentDate() {
    const today = new Date().toISOString().split('T')[0];
    this.elements.evaluationDate.value = today;
    this.state.evaluationDate = today;
  }

  initializeDemo() {
    setTimeout(() => {
      this.elements.departmentSelect.value = 'sales';
      this.onDepartmentChange();
    }, 100);
  }

  bindEvents() {
    // Form controls
    this.elements.departmentSelect.addEventListener('change', () => this.onDepartmentChange());
    this.elements.employeeSelect.addEventListener('change', () => this.onEmployeeChange());
    this.elements.supervisorSelect.addEventListener('change', () => {
      this.state.currentSupervisor = this.elements.supervisorSelect.value;
    });
    this.elements.evaluationDate.addEventListener('change', () => {
      this.state.evaluationDate = this.elements.evaluationDate.value;
    });

    // Generate button
    this.elements.generateBtn.addEventListener('click', () => this.generateAndSendReport());

    // Language switcher
    if (this.elements.langSwitch) {
      this.elements.langSwitch.addEventListener('click', () => this.switchLanguage());
    }

    // Notes
    this.elements.generalNotes?.addEventListener('input', (e) => {
      this.state.notes.general = e.target.value;
    });
    this.elements.departmentNotes?.addEventListener('input', (e) => {
      this.state.notes.department = e.target.value;
    });
    this.elements.overallNotes?.addEventListener('input', (e) => {
      this.state.notes.overall = e.target.value;
    });

    // Print event
    window.addEventListener('beforeprint', () => this.prepareForPrint());

    // Notification close
    if (this.elements.notificationClose) {
      this.elements.notificationClose.addEventListener('click', () => this.hideNotification());
    }
  }

  async onDepartmentChange() {
    this.state.currentDepartment = this.elements.departmentSelect.value;
    await this.populateEmployees();
    this.renderDepartmentCriteria();
  }

  onEmployeeChange() {
    this.state.currentEmployee = this.elements.employeeSelect.value;
    this.renderDepartmentCriteria();
  }

  populateSupervisors() {
    const lang = this.state.currentLanguage;
    const select = this.elements.supervisorSelect;

    if (!select) return;

    select.innerHTML = `<option value="">-- ${TRANSLATIONS[lang].supervisor} --</option>`;

    Object.values(ORGANIZATION_DATA.supervisors).forEach(departmentSupervisors => {
      departmentSupervisors.forEach(supervisor => {
        const option = document.createElement('option');
        option.value = supervisor.id;
        option.textContent = `${supervisor.name} - ${supervisor.position[lang]}`;
        select.appendChild(option);
      });
    });
  }

  async populateEmployees() {
    const deptId = this.state.currentDepartment;
    const dept = ORGANIZATION_DATA.departments[deptId];
    const lang = this.state.currentLanguage;
    const select = this.elements.employeeSelect;

    if (!select || !dept) return;

    select.innerHTML = `<option value="">-- ${TRANSLATIONS[lang].employee} --</option>`;

    let allEmployees = [];

    // جمع جميع الموظفين
    if (dept.employees) {
      allEmployees = [...dept.employees];
    }

    if (dept.teams) {
      Object.values(dept.teams).forEach(team => {
        allEmployees = [...allEmployees, ...team.employees];
      });
    }

    // إضافة الخيارات
    allEmployees.forEach(employee => {
      const option = document.createElement('option');
      option.value = employee.id;
      option.textContent = `${employee.name} - ${employee.position[lang]}`;
      select.appendChild(option);
    });

    // إعادة تعيين الموظف المحدد
    this.state.currentEmployee = '';
  }

  renderGeneralCriteria() {
    const container = this.elements.generalCriteriaBody;
    const lang = this.state.currentLanguage;

    if (!container) return;

    container.innerHTML = '';

    ORGANIZATION_DATA.general.forEach(criterion => {
      const rating = this.state.ratings.general.get(criterion.id) || 0;
      const calculated = rating > 0 ? (rating / 5) * criterion.weight : 0;

      const row = document.createElement('tr');
      row.innerHTML = `
      <td>
      <div class="criteria-name">${criterion.name[lang]}</div>
      <div class="criteria-description">${criterion.description[lang]}</div>
      </td>
      <td>${criterion.description[lang]}</td>
      <td style="text-align: center;">
      <span class="weight-badge">${criterion.weight}</span>
      </td>
      <td>
      <div class="rating-controls" data-criterion-id="${criterion.id}" data-criterion-type="general">
      ${[1,2,3,4,5].map(num => `
        <div class="rating-btn ${rating === num ? 'selected' : ''}"
        data-value="${num}">
        ${num}
        </div>
        `).join('')}
        <span class="printed-rating" style="display: none;">${rating > 0 ? rating : '-'}</span>
        </div>
        </td>
        <td style="text-align: center;">
        <span class="calculated-value">${calculated > 0 ? calculated.toFixed(1) : '0.0'}</span>
        </td>
        `;
        container.appendChild(row);
    });

    this.bindRatingEvents();
  }

  renderDepartmentCriteria() {
    const deptId = this.state.currentDepartment;
    const dept = ORGANIZATION_DATA.departments[deptId];
    const lang = this.state.currentLanguage;
    const container = this.elements.departmentCriteria;

    if (!container) return;

    if (!deptId || !dept) {
      container.innerHTML = `
      <div class="empty-state">
      <i class="fas fa-hand-pointer"></i>
      <h3>${TRANSLATIONS[lang].selectPromptTitle}</h3>
      <p>${TRANSLATIONS[lang].selectPromptText}</p>
      </div>
      `;
      this.hideSummary();
      return;
    }

    const criteria = this.getDepartmentCriteria(deptId, this.state.currentEmployee, lang);

    if (criteria.length === 0) {
      container.innerHTML = `
      <div class="empty-state">
      <i class="fas fa-exclamation-circle"></i>
      <h3>${lang === 'ar' ? 'لا توجد معايير مخصصة' : 'No specific criteria'}</h3>
      <p>${lang === 'ar' ? 'يرجى التواصل مع إدارة الموارد البشرية' : 'Please contact HR Department'}</p>
      </div>
      `;
      this.hideSummary();
      return;
    }

    let tableHTML = `
    <div class="table-responsive">
    <table class="criteria-table">
    <thead>
    <tr>
    <th width="30%">${TRANSLATIONS[lang].criteria}</th>
    <th width="35%">${TRANSLATIONS[lang].description}</th>
    <th width="10%">${TRANSLATIONS[lang].weight}</th>
    <th width="15%">${TRANSLATIONS[lang].rating}</th>
    <th width="10%">${TRANSLATIONS[lang].value}</th>
    </tr>
    </thead>
    <tbody>
    `;

    criteria.forEach(criterion => {
      const rating = this.state.ratings.department.get(criterion.id) || 0;
      const calculated = rating > 0 ? (rating / 5) * criterion.weight : 0;
      const description = criterion.description?.[lang] || '';

      tableHTML += `
      <tr>
      <td>
      <div class="criteria-name">${criterion.name[lang]}</div>
      ${description ? `<div class="criteria-description">${description}</div>` : ''}
      </td>
      <td>${description}</td>
      <td style="text-align: center;">
      <span class="weight-badge">${criterion.weight}</span>
      </td>
      <td>
      <div class="rating-controls" data-criterion-id="${criterion.id}" data-criterion-type="department">
      ${[1,2,3,4,5].map(num => `
        <div class="rating-btn ${rating === num ? 'selected' : ''}"
        data-value="${num}">${num}</div>
        `).join('')}
        <span class="printed-rating" style="display: none;">${rating > 0 ? rating : '-'}</span>
        </div>
        </td>
        <td style="text-align: center;">
        <span class="calculated-value">${calculated > 0 ? calculated.toFixed(1) : '0.0'}</span>
        </td>
        </tr>
        `;
    });

    tableHTML += `</tbody></table></div>`;
    container.innerHTML = tableHTML;

    this.bindRatingEvents();
    this.updateScores();
  }

  getDepartmentCriteria(deptId, employeeId, lang = 'ar') {
    const dept = ORGANIZATION_DATA.departments[deptId];
    if (!dept) return [];

    const employeeOption = this.elements.employeeSelect?.querySelector(`option[value="${employeeId}"]`);
    const employeeText = employeeOption?.textContent || '';

    // تحديد المعايير بناءً على القسم والوظيفة
    if (deptId === 'sales') {
      if (employeeText.includes('مندوب مبيعات') || employeeText.includes('Sales Representative')) {
        return dept.criteria?.sales_rep || [];
      } else if (employeeText.includes('موظف تسليم') || employeeText.includes('Delivery Staff')) {
        return dept.criteria?.delivery_staff || [];
      } else if (employeeText.includes('عامل تسليم') || employeeText.includes('Delivery Worker')) {
        return dept.criteria?.delivery_workers || [];
      }
    } else if (deptId === 'vehicles') {
      if (employeeText.includes('رافعة شوكية') || employeeText.includes('Forklift Driver')) {
        return dept.criteria?.forklift_drivers || [];
      } else if (employeeText.includes('سائق شحن') || employeeText.includes('Shipping Driver')) {
        return dept.criteria?.shipping_drivers || [];
      }
    } else if (deptId === 'marketing') {
      if (employeeText.includes('مصور') || employeeText.includes('Photographer')) {
        return dept.teams?.photographer?.criteria || [];
      } else if (employeeText.includes('مونتاج') || employeeText.includes('Video Editor')) {
        return dept.teams?.editor?.criteria || [];
      } else if (employeeText.includes('مصمم إعلان') || employeeText.includes('Ad Designer')) {
        return dept.teams?.designer?.criteria || [];
      } else if (employeeText.includes('سوشيال ميديا') || employeeText.includes('Social Media')) {
        return dept.teams?.social_media?.criteria || [];
      }
    } else if (deptId === 'projects') {
      if (employeeText.includes('فورمان') || employeeText.includes('Foreman')) {
        return dept.criteria?.foremen || [];
      } else if (employeeText.includes('عامل مشروع') || employeeText.includes('Project Worker')) {
        return dept.criteria?.project_workers || [];
      }
    } else if (deptId === 'marble') {
      if (employeeText.includes('عامل مشروع') || employeeText.includes('Project Worker')) {
        return dept.criteria?.project_workers || [];
      } else if (employeeText.includes('عامل قص') || employeeText.includes('Cutter')) {
        return dept.criteria?.cutting_workers || [];
      } else if (employeeText.includes('عامل تركيب') || employeeText.includes('Installer')) {
        return dept.criteria?.installation_workers || [];
      } else if (employeeText.includes('عامل تشطيب') || employeeText.includes('Finisher')) {
        return dept.criteria?.finishing_workers || [];
      }
    }

    // القواعد العامة
    return Array.isArray(dept.criteria) ? dept.criteria : [];
  }

  bindRatingEvents() {
    document.querySelectorAll('.rating-controls').forEach(container => {
      container.querySelectorAll('.rating-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const value = parseInt(e.target.dataset.value);
          const criterionId = container.dataset.criterionId;
          const type = container.dataset.criterionType;

          this.state.ratings[type].set(criterionId, value);

          // تحديث الواجهة
          container.querySelectorAll('.rating-btn').forEach(b => {
            b.classList.remove('selected');
          });
          e.target.classList.add('selected');

          // تحديث القيمة المحسوبة
          const row = e.target.closest('tr');
          const calculatedCell = row?.querySelector('.calculated-value');
          const printedRating = container.querySelector('.printed-rating');

          if (printedRating) {
            printedRating.textContent = value;
          }

          if (calculatedCell) {
            const criterion = this.getCriterionById(type, criterionId);
            if (criterion) {
              const calculated = (value / 5) * criterion.weight;
              calculatedCell.textContent = calculated.toFixed(1);
            }
          }

          this.updateScores();
        });
      });
    });
  }

  getCriterionById(type, criterionId) {
    if (type === 'general') {
      return ORGANIZATION_DATA.general.find(c => c.id === criterionId);
    } else {
      const deptId = this.state.currentDepartment;
      const criteria = this.getDepartmentCriteria(deptId, this.state.currentEmployee);
      return criteria.find(c => c.id === criterionId);
    }
  }

  calculateScore(type, criteria) {
    let total = 0;

    criteria.forEach(criterion => {
      const rating = this.state.ratings[type].get(criterion.id) || 0;
      if (rating > 0) {
        total += (rating / 5) * criterion.weight;
      }
    });

    return Math.round(total * 100) / 100;
  }

  getGrade(percentage) {
    const lang = this.state.currentLanguage;

    if (percentage >= 90) {
      return {
        name: lang === 'ar' ? 'ممتاز' : 'Excellent',
        message: lang === 'ar' ? 'أداء متميز' : 'Outstanding Performance',
        color: '#27ae60'
      };
    } else if (percentage >= 80) {
      return {
        name: lang === 'ar' ? 'جيد جداً' : 'Very Good',
        message: lang === 'ar' ? 'أداء عالي' : 'High Performance',
        color: '#2ecc71'
      };
    } else if (percentage >= 70) {
      return {
        name: lang === 'ar' ? 'جيد' : 'Good',
        message: lang === 'ar' ? 'أداء جيد' : 'Good Performance',
        color: '#f39c12'
      };
    } else if (percentage >= 60) {
      return {
        name: lang === 'ar' ? 'مقبول' : 'Acceptable',
        message: lang === 'ar' ? 'أداء مقبول' : 'Acceptable Performance',
        color: '#e67e22'
      };
    } else {
      return {
        name: lang === 'ar' ? 'ضعيف' : 'Weak',
        message: lang === 'ar' ? 'يحتاج للتحسين' : 'Needs Improvement',
        color: '#e74c3c'
      };
    }
  }

  updateScores() {
    try {
      const generalScore = this.calculateScore('general', ORGANIZATION_DATA.general);
      const deptId = this.state.currentDepartment;
      const departmentCriteria = this.getDepartmentCriteria(deptId, this.state.currentEmployee);
      const departmentScore = this.calculateScore('department', departmentCriteria);

      const totalScore = generalScore + departmentScore;
      const totalMax = 100; // 20 عام + 80 قسم
      const percentage = Math.round((totalScore / totalMax) * 100);
      const grade = this.getGrade(percentage);

      // تحديث العرض
      if (this.elements.generalScore) {
        this.elements.generalScore.textContent = `${generalScore.toFixed(1)}/20`;
      }

      if (this.elements.departmentScore) {
        this.elements.departmentScore.textContent = `${departmentScore.toFixed(1)}/80`;
      }

      if (deptId && this.elements.summaryCard) {
        this.elements.summaryCard.style.display = 'block';
        this.elements.totalScoreDisplay.style.display = 'block';

        // تحديث الملخص
        if (this.elements.summaryGeneral) {
          this.elements.summaryGeneral.textContent = `${generalScore.toFixed(1)}/20`;
        }
        if (this.elements.summaryDepartment) {
          this.elements.summaryDepartment.textContent = `${departmentScore.toFixed(1)}/80`;
        }
        if (this.elements.summaryPercentage) {
          this.elements.summaryPercentage.textContent = `${percentage}%`;
        }
        if (this.elements.summaryGrade) {
          this.elements.summaryGrade.textContent = grade.name;
        }
        if (this.elements.summaryMessage) {
          this.elements.summaryMessage.textContent = grade.message;
        }

        // تحديث النتيجة الإجمالية
        if (this.elements.finalScore) {
          this.elements.finalScore.textContent = totalScore.toFixed(1);
        }
        if (this.elements.scoreGrade) {
          this.elements.scoreGrade.textContent = `${grade.name} - ${grade.message}`;
        }
        if (this.elements.performanceTips) {
          this.elements.performanceTips.textContent = grade.message;
        }
        if (this.elements.scoreProgress) {
          this.elements.scoreProgress.style.width = `${percentage}%`;
          this.elements.scoreProgress.style.background = grade.color;
        }
      }
    } catch (error) {
      console.error('Error updating scores:', error);
    }
  }

  hideSummary() {
    if (this.elements.summaryCard) {
      this.elements.summaryCard.style.display = 'none';
    }
    if (this.elements.totalScoreDisplay) {
      this.elements.totalScoreDisplay.style.display = 'none';
    }
  }

  validateForm() {
    const lang = this.state.currentLanguage;
    const errors = [];

    if (!this.state.currentDepartment) {
      errors.push(lang === 'ar' ? 'يرجى اختيار القسم' : 'Please select a department');
    }

    if (!this.state.currentEmployee) {
      errors.push(lang === 'ar' ? 'يرجى اختيار الموظف' : 'Please select an employee');
    }

    if (!this.state.currentSupervisor) {
      errors.push(lang === 'ar' ? 'يرجى اختيار المشرف' : 'Please select a supervisor');
    }

    // التحقق من وجود تقييمات
    const generalRatings = Array.from(this.state.ratings.general.values()).filter(r => r > 0);
    const deptCriteria = this.getDepartmentCriteria(this.state.currentDepartment, this.state.currentEmployee);
    const deptRatings = Array.from(this.state.ratings.department.values()).filter(r => r > 0);

    if (generalRatings.length === 0 && deptRatings.length === 0) {
      errors.push(lang === 'ar' ? 'يرجى إدخال تقييمات' : 'Please enter ratings');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async generateAndSendReport() {
    try {
      this.state.isLoading = true;
      this.setLoadingState(true);

      const validation = this.validateForm();
      if (!validation.isValid) {
        this.showNotification('error',
                              this.state.currentLanguage === 'ar' ? 'خطأ في البيانات' : 'Validation Error',
                              validation.errors.join('\n'));
        return;
      }

      this.showNotification('info',
                            this.state.currentLanguage === 'ar' ? 'جارٍ المعالجة' : 'Processing',
                            this.state.currentLanguage === 'ar' ? 'جاري إعداد التقرير...' : 'Preparing report...');

      // جمع البيانات
      const reportData = this.collectReportData();

      // إرسال إلى Telegram
      await this.sendToTelegram(reportData);

      // تحضير للطباعة
      this.prepareForPrint();

      // الطباعة
      setTimeout(() => {
        window.print();
        this.showNotification('success',
                              this.state.currentLanguage === 'ar' ? 'تمت العملية' : 'Success',
                              this.state.currentLanguage === 'ar' ? 'تم إرسال التقرير بنجاح' : 'Report sent successfully');
      }, 500);

    } catch (error) {
      console.error('Error generating report:', error);
      this.showNotification('error',
                            this.state.currentLanguage === 'ar' ? 'خطأ' : 'Error',
                            this.state.currentLanguage === 'ar' ? 'حدث خطأ أثناء العملية' : 'An error occurred');
    } finally {
      this.state.isLoading = false;
      this.setLoadingState(false);
    }
  }

  setLoadingState(isLoading) {
    const btn = this.elements.generateBtn;
    if (!btn) return;

    if (isLoading) {
      btn.disabled = true;
      btn.classList.add('loading');
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري المعالجة...';
    } else {
      btn.disabled = false;
      btn.classList.remove('loading');
      btn.innerHTML = '<i class="fab fa-telegram"></i> <span id="generateButtonText">طباعة وإرسال التقرير</span>';
    }
  }

  prepareForPrint() {
    const lang = this.state.currentLanguage;

    // تعيين معلومات التقرير للطباعة
    const employeeOption = this.elements.employeeSelect?.selectedOptions[0];
    const supervisorOption = this.elements.supervisorSelect?.selectedOptions[0];
    const deptId = this.state.currentDepartment;
    const dept = ORGANIZATION_DATA.departments[deptId];

    if (employeeOption && this.elements.printEmployeeInfo) {
      this.elements.printEmployeeInfo.textContent = employeeOption.textContent;
      this.elements.printEmployeeSignature.textContent = employeeOption.textContent.split('-')[0].trim();
    }

    if (dept && this.elements.printDepartmentInfo) {
      this.elements.printDepartmentInfo.textContent = dept.name[lang];
    }

    if (supervisorOption && this.elements.printSupervisorInfo) {
      this.elements.printSupervisorInfo.textContent = supervisorOption.textContent;
      this.elements.printSupervisorSignature.textContent = supervisorOption.textContent.split('-')[0].trim();
    }

    // تعيين التاريخ
    const today = new Date();
    const formattedDate = today.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const dateElements = [
      this.elements.printDateInfo,
      this.elements.printSignatureDate1,
      this.elements.printSignatureDate2,
      this.elements.printSignatureDate3
    ];

    dateElements.forEach(el => {
      if (el) el.textContent = formattedDate;
    });

      // تحديث الملاحظات للطباعة
      this.updatePrintNotes();

      // إظهار عناصر الطباعة
      const printElements = document.querySelectorAll('.print-elements > *');
      printElements.forEach(el => {
        el.style.display = 'block';
      });
  }

  updatePrintNotes() {
    const lang = this.state.currentLanguage;
    const truncateText = (text, maxLength = 150) => {
      if (!text) return lang === 'ar' ? 'لا توجد ملاحظات' : 'No notes';
      if (text.length > maxLength) {
        return text.substring(0, maxLength) + '...';
      }
      return text;
    };

    if (this.elements.printGeneralNotesContent) {
      this.elements.printGeneralNotesContent.textContent =
      truncateText(this.state.notes.general);
    }

    if (this.elements.printDepartmentNotesContent) {
      this.elements.printDepartmentNotesContent.textContent =
      truncateText(this.state.notes.department);
    }

    if (this.elements.printOverallNotesContent) {
      this.elements.printOverallNotesContent.textContent =
      truncateText(this.state.notes.overall);
    }
  }

  collectReportData() {
    const lang = this.state.currentLanguage;

    // حساب النتائج
    const generalScore = this.calculateScore('general', ORGANIZATION_DATA.general);
    const deptId = this.state.currentDepartment;
    const departmentCriteria = this.getDepartmentCriteria(deptId, this.state.currentEmployee);
    const departmentScore = this.calculateScore('department', departmentCriteria);
    const totalScore = generalScore + departmentScore;
    const percentage = Math.round((totalScore / 100) * 100);
    const grade = this.getGrade(percentage);

    return {
      employee: this.elements.employeeSelect?.selectedOptions[0]?.textContent || '',
      department: ORGANIZATION_DATA.departments[deptId]?.name[lang] || '',
      supervisor: this.elements.supervisorSelect?.selectedOptions[0]?.textContent || '',
      date: this.state.evaluationDate,
      generalScore,
      departmentScore,
      totalScore,
      percentage,
      grade: grade.name,
      gradeMessage: grade.message,
      notes: this.state.notes
    };
  }

  async sendToTelegram(reportData) {
    try {
      const lang = this.state.currentLanguage;
      const message = this.formatTelegramMessage(reportData, lang);

      const url = `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: CONFIG.HR_CHANNEL,
          text: message,
          parse_mode: 'Markdown'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('Telegram API Error:', error);
      throw error;
    }
  }

  formatTelegramMessage(reportData, lang) {
    return `
    📊 *${lang === 'ar' ? 'تقرير التقييم الموحد' : 'Unified Evaluation Report'}*
    ----------------------------
    👤 *${lang === 'ar' ? 'الموظف:' : 'Employee:'}* ${reportData.employee}
    🏢 *${lang === 'ar' ? 'القسم:' : 'Department:'}* ${reportData.department}
    👨‍💼 *${lang === 'ar' ? 'المشرف:' : 'Supervisor:'}* ${reportData.supervisor}
    📅 *${lang === 'ar' ? 'تاريخ التقييم:' : 'Evaluation Date:'}* ${reportData.date}
    ----------------------------
    📈 *${lang === 'ar' ? 'النتائج:' : 'Results:'}*
    • ${lang === 'ar' ? 'المعايير العامة:' : 'General Criteria:'} ${reportData.generalScore.toFixed(2)}/20
    • ${lang === 'ar' ? 'معايير القسم:' : 'Department Criteria:'} ${reportData.departmentScore.toFixed(2)}/80
    • ${lang === 'ar' ? 'الإجمالي:' : 'Total:'} ${reportData.totalScore.toFixed(2)}/100
    • ${lang === 'ar' ? 'النسبة:' : 'Percentage:'} ${reportData.percentage}%
    • ${lang === 'ar' ? 'التقدير:' : 'Grade:'} ${reportData.grade}
    ----------------------------
    📝 *${lang === 'ar' ? 'الملاحظات:' : 'Notes:'}*
    ${reportData.notes.overall || (lang === 'ar' ? 'لا توجد ملاحظات' : 'No notes')}
    ----------------------------
    ${lang === 'ar' ? 'تم إرسال هذا التقرير تلقائياً' : 'This report was automatically sent'}
    `.trim();
  }

  switchLanguage() {
    this.state.currentLanguage = this.state.currentLanguage === 'ar' ? 'en' : 'ar';
    this.applyLanguage();
  }

  applyLanguage() {
    const lang = this.state.currentLanguage;
    const t = TRANSLATIONS[lang];

    // تحديث جميع النصوص
    Object.keys(t).forEach(key => {
      const element = this.elements[key];
      if (element && typeof t[key] === 'string') {
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          element.placeholder = t[key];
        } else {
          element.textContent = t[key];
        }
      }
    });

    // تحديث زر تبديل اللغة
    if (this.elements.langText) {
      this.elements.langText.textContent = t.langText;
    }

    // تحديث اتجاه الصفحة
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;

    // إعادة تعبئة البيانات
    this.populateDepartments();
    this.populateEmployees();
    this.populateSupervisors();

    // إعادة عرض المعايير
    this.renderGeneralCriteria();
    this.renderDepartmentCriteria();

    // تحديث الملخص
    this.updateScores();
  }

  populateDepartments() {
    const lang = this.state.currentLanguage;
    const options = this.elements.departmentSelect?.querySelectorAll('option');

    if (!options) return;

    options.forEach((option, index) => {
      if (index > 0) {
        const span = option.querySelector('span');
        if (span) {
          const className = span.className.replace('lang-', '');
          if (className in TRANSLATIONS[lang]) {
            span.textContent = TRANSLATIONS[lang][className];
          }
        }
      }
    });
  }

  showNotification(type, title, message) {
    const notification = this.elements.notification;
    if (!notification) return;

    // إعداد النوع
    notification.className = `notification ${type}`;

    // تحديث المحتوى
    if (this.elements.notificationTitle) {
      this.elements.notificationTitle.textContent = title;
    }
    if (this.elements.notificationMessage) {
      this.elements.notificationMessage.textContent = message;
    }

    // تحديث الأيقونة
    const icon = notification.querySelector('.notification-icon i');
    if (icon) {
      icon.className = type === 'success' ? 'fas fa-check-circle' :
      type === 'error' ? 'fas fa-exclamation-circle' :
      'fas fa-info-circle';
    }

    // إظهار الإشعار
    notification.classList.add('show');

    // إخفاء تلقائي
    setTimeout(() => {
      this.hideNotification();
    }, 5000);
  }

  hideNotification() {
    if (this.elements.notification) {
      this.elements.notification.classList.remove('show');
    }
  }
}

// ========== تهيئة التطبيق ==========
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.app = new EvaluationApp();
    console.log('✅ Evaluation App initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize app:', error);
    alert('حدث خطأ أثناء تحميل التطبيق. يرجى تحديث الصفحة.');
  }
});

// ========== دالة مساعدة للشعار ==========
function handleLogoError(img) {
  img.style.display = 'none';
  img.parentElement.innerHTML = '<div class="logo-placeholder"><span>V</span></div>';
}
