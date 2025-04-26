document.addEventListener('DOMContentLoaded', function() {
    const studyForm = document.getElementById('studyForm');
    const scheduleDiv = document.getElementById('schedule');
    const clearFormBtn = document.getElementById('clearForm');
    const scheduleActions = document.getElementById('scheduleActions');
    const toast = document.getElementById('toast');
    const toggleButton = document.getElementById('togglePreferredHours');
    const preferredHoursDiv = document.getElementById('preferredHours');
    
    // Load saved form data
    loadSavedFormData();
    
    studyForm.addEventListener('submit', function(e) {
      e.preventDefault();

      // Get form values
      const subjectsInput = document.getElementById('subjects').value.trim();
      const checkedDays = Array.from(document.querySelectorAll('input[name="day"]:checked')).map(cb => cb.value);
      const hours = parseInt(document.getElementById('hours').value);
      const breakDuration = parseInt(document.getElementById('breakDuration').value);

      // Validate inputs
      if (!subjectsInput || checkedDays.length === 0 || isNaN(hours) || hours < 1) {
        showToast('Please fill in all fields properly', true);
        return;
      }

      // Process subjects
      const subjects = subjectsInput.split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      if (subjects.length === 0) {
        showToast('Please enter at least one subject', true);
        return;
      }

      // Save form data
      saveFormData();

      // Generate schedule
      generateSchedule(subjects, checkedDays, hours, breakDuration);
    });
    
    // Toggle preferred hours
    toggleButton.addEventListener('click', function() {
      const isHidden = preferredHoursDiv.classList.contains('hidden');
      preferredHoursDiv.classList.toggle('hidden');
      toggleButton.setAttribute('aria-expanded', !isHidden);
      toggleButton.innerHTML = `<i class="fas fa-clock" aria-hidden="true"></i> ${isHidden ? 'Hide' : 'Set'} Preferred Hours`;
    });
    
    function generateSchedule(subjects, days, hoursPerDay, breakDuration) {
      scheduleDiv.innerHTML = `
        <h2><i class="fas fa-calendar-check"></i> Your Weekly Study Plan</h2>
        <div class="plan-info">
          <p><strong>Subjects:</strong> ${subjects.join(', ')}</p>
          <p><strong>Total Study Hours:</strong> ${days.length * hoursPerDay}</p>
          <p><strong>Break Duration:</strong> ${breakDuration} minutes</p>
        </div>
        <ul class="plan">
      `;

      let subjectIndex = 0;

      // Clear existing notifications
      cancelAllNotifications();

      days.forEach(day => {
        const startTimeInput = document.getElementById(`startTime${day}`);
        let startTime = "09:00"; // Default time
        
        if (startTimeInput && startTimeInput.value) {
          startTime = startTimeInput.value;
        }
        
        const [startHour, startMinute] = startTime.split(':').map(Number);
        
        const dayElement = document.createElement('li');
        dayElement.innerHTML = `<strong><i class="fas fa-calendar-day"></i> ${day}</strong><ul></ul>`;
        const dayList = dayElement.querySelector('ul');

        let currentHour = startHour;
        let currentMinute = startMinute;

        for (let h = 0; h < hoursPerDay; h++) {
          const subject = subjects[subjectIndex % subjects.length];
          const sessionStartTime = formatTime(currentHour, currentMinute);
          
          // Add study session
          const sessionEndTime = addMinutes(currentHour, currentMinute, 60);
          const sessionElement = document.createElement('li');
          sessionElement.innerHTML = `
            <span class="session-subject">${subject}</span>
            <span class="session-time">${sessionStartTime} - ${sessionEndTime}</span>
          `;
          dayList.appendChild(sessionElement);

          // Schedule notification for this session
          scheduleSessionNotification(day, subject, currentHour, currentMinute);

          // Add break if not the last session
          if (h < hoursPerDay - 1) {
            const breakStartTime = sessionEndTime;
            const breakEndTime = addMinutes(
              parseInt(sessionEndTime.split(':')[0]),
              parseInt(sessionEndTime.split(':')[1]),
              breakDuration
            );
            
            const breakElement = document.createElement('li');
            breakElement.className = 'break-session';
            breakElement.innerHTML = `
              <span class="session-subject">Break</span>
              <span class="session-time">${breakStartTime} - ${breakEndTime}</span>
            `;
            dayList.appendChild(breakElement);

            // Update current time to after break
            [currentHour, currentMinute] = breakEndTime.split(':').map(Number);
          } else {
            // Update time for next session without break
            [currentHour, currentMinute] = sessionEndTime.split(':').map(Number);
          }

          subjectIndex++;
        }

        scheduleDiv.querySelector('.plan').appendChild(dayElement);
      });

      scheduleDiv.innerHTML += '</ul>';
      scheduleActions.classList.remove('hidden');

      // Add notification permission request if needed
      if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        addNotificationButton();
      }

      showToast('Schedule generated successfully!');
    }

    // Store notification timeouts
    let notificationTimeouts = [];

    function cancelAllNotifications() {
      notificationTimeouts.forEach(timeout => clearTimeout(timeout));
      notificationTimeouts = [];
    }

    function scheduleSessionNotification(day, subject, hour, minute) {
      if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
      }

      const now = new Date();
      const sessionDate = new Date();
      
      // Calculate the next occurrence of the specified day
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayIndex = days.indexOf(day);
      const currentDay = now.getDay();
      let daysUntilSession = dayIndex - currentDay;
      
      if (daysUntilSession <= 0) {
        daysUntilSession += 7; // Move to next week if the day has passed
      }

      // Set the date for the next session
      sessionDate.setDate(now.getDate() + daysUntilSession);
      sessionDate.setHours(hour, minute, 0, 0);

      // Calculate time for notification (10 minutes before)
      const notificationTime = new Date(sessionDate);
      notificationTime.setMinutes(notificationTime.getMinutes() - 10);

      // Only schedule if the notification time is in the future
      if (notificationTime > now) {
        const timeUntilNotification = notificationTime.getTime() - now.getTime();
        
        const timeout = setTimeout(() => {
          const notification = new Notification('Upcoming Study Session', {
            body: `Your ${subject} session starts in 10 minutes!`,
            icon: 'https://cdn-icons-png.flaticon.com/512/1157/1157001.png'
          });

          // Add click handler to focus the window when notification is clicked
          notification.onclick = function() {
            window.focus();
            notification.close();
          };
        }, timeUntilNotification);

        notificationTimeouts.push(timeout);
      }
    }

    function addNotificationButton() {
      const notificationBtn = document.createElement('button');
      notificationBtn.className = 'notification-btn action-btn';
      notificationBtn.innerHTML = '<i class="fas fa-bell"></i> Enable Notifications';
      
      notificationBtn.addEventListener('click', async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            showToast('Notifications enabled! You\'ll be notified 10 minutes before each session.');
            notificationBtn.remove();
            // Reschedule notifications for existing schedule
            const scheduleContent = scheduleDiv.querySelector('.plan');
            if (scheduleContent) {
              generateSchedule(
                Array.from(document.querySelectorAll('.session-subject')).map(el => el.textContent),
                Array.from(document.querySelectorAll('.plan > li > strong')).map(el => el.textContent.trim()),
                parseInt(document.getElementById('hours').value),
                parseInt(document.getElementById('breakDuration').value)
              );
            }
          } else {
            showToast('Notification permission denied', true);
          }
        } catch (error) {
          console.error('Error requesting notification permission:', error);
          showToast('Error enabling notifications', true);
        }
      });

      scheduleActions.insertBefore(notificationBtn, scheduleActions.firstChild);
    }

    function formatTime(hours, minutes) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    function addMinutes(hours, minutes, addMinutes) {
      const date = new Date();
      date.setHours(hours, minutes + addMinutes);
      return formatTime(date.getHours(), date.getMinutes());
    }

    function saveFormData() {
      const formData = {
        subjects: document.getElementById('subjects').value,
        days: Array.from(document.querySelectorAll('input[name="day"]:checked')).map(cb => cb.value),
        hours: document.getElementById('hours').value,
        breakDuration: document.getElementById('breakDuration').value,
        startTimes: {}
      };

      // Save start times
      ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].forEach(day => {
        const timeInput = document.getElementById(`startTime${day}`);
        if (timeInput) {
          formData.startTimes[day] = timeInput.value;
        }
      });

      localStorage.setItem('studyPlannerData', JSON.stringify(formData));
    }

    function loadSavedFormData() {
      const savedData = localStorage.getItem('studyPlannerData');
      if (savedData) {
        try {
          const formData = JSON.parse(savedData);
          
          document.getElementById('subjects').value = formData.subjects || '';
          document.getElementById('hours').value = formData.hours || 2;
          document.getElementById('breakDuration').value = formData.breakDuration || 15;

          // Set checked days
          const dayCheckboxes = document.querySelectorAll('input[name="day"]');
          dayCheckboxes.forEach(checkbox => {
            checkbox.checked = formData.days?.includes(checkbox.value) || false;
          });

          // Set start times
          if (formData.startTimes) {
            Object.entries(formData.startTimes).forEach(([day, time]) => {
              const timeInput = document.getElementById(`startTime${day}`);
              if (timeInput) {
                timeInput.value = time;
              }
            });
          }
        } catch (error) {
          console.error('Error loading saved data:', error);
          localStorage.removeItem('studyPlannerData');
        }
      }
    }

    function showToast(message, isError = false) {
      toast.textContent = message;
      toast.className = `toast${isError ? ' error' : ''}`;
      
      // Force reflow
      toast.offsetHeight;
      
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    }

    // Clear form handler
    clearFormBtn.addEventListener('click', function() {
      studyForm.reset();
      scheduleDiv.innerHTML = '';
      scheduleActions.classList.add('hidden');
      localStorage.removeItem('studyPlannerData');
      showToast('Form cleared');
    });

    // Print schedule handler
    document.getElementById('printSchedule').addEventListener('click', function() {
      window.print();
    });

    // Save schedule handler
    document.getElementById('saveSchedule').addEventListener('click', function() {
      const scheduleHtml = scheduleDiv.innerHTML;
      const blob = new Blob([scheduleHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'study-schedule.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Schedule saved to file');
    });

    // Download PDF handler
    document.getElementById('downloadPdf').addEventListener('click', async function() {
      // Create a clone of the schedule for PDF
      const pdfContent = document.createElement('div');
      pdfContent.className = 'pdf-mode';
      
      // Get current date
      const date = new Date();
      const formattedDate = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      pdfContent.innerHTML = `
        <div class="container">
          <header>
            <h1><i class="fas fa-book-open"></i> Study Plan</h1>
            <p class="subtitle">Generated on ${formattedDate}</p>
          </header>
          <div class="schedule-container">
            ${scheduleDiv.querySelector('.plan-info').outerHTML}
            ${scheduleDiv.querySelector('.plan').outerHTML}
          </div>
        </div>
      `;

      // PDF options
      const opt = {
        margin: [0.5, 0.75],
        filename: `study-schedule-${date.toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
          scrollY: 0,
          windowWidth: 1024
        },
        jsPDF: { 
          unit: 'in', 
          format: 'letter', 
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      try {
        // Show loading toast
        showToast('Generating PDF...');
        
        // Generate PDF
        await html2pdf()
          .set(opt)
          .from(pdfContent)
          .toPdf()
          .get('pdf')
          .then((pdf) => {
            // Add page numbers
            const totalPages = pdf.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
              pdf.setPage(i);
              pdf.setFontSize(10);
              pdf.setTextColor(100);
              pdf.text(
                `Page ${i} of ${totalPages}`,
                pdf.internal.pageSize.getWidth() / 2,
                pdf.internal.pageSize.getHeight() - 0.3,
                { align: 'center' }
              );
            }
          })
          .save();
        
        // Show success toast
        showToast('PDF downloaded successfully!');
      } catch (error) {
        console.error('Error generating PDF:', error);
        showToast('Error generating PDF', true);
      }
    });
});