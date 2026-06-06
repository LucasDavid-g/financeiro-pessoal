import { useState } from 'react'
import { Modal } from './Modal.jsx'
import { useApp } from '../../context/AppContext.jsx'
import { fmt } from '../../utils/formatters.js'
import styles from './PagarModal.module.css'

// lancamento: objeto do lançamento pendente a ser pago
// onClose: fecha o modal
export function PagarModal({ lancamento, onClose }) {
  const { state, dispatch } = useApp()
  const [contaId, setContaId] = useState('')

  const contasOperacionais = state.contas.filter(c =>
    c.tipo === 'corrente' || c.tipo === 'digital'
  )

  const confirmar = () => {
    if (!contaId) return
    dispatch({ type: 'PAGAR_COMPROMISSO', id: lancamento.id, contaId: parseInt(contaId) })
    onClose()
  }

  if (!lancamento) return null

  return (
    <Modal open={!!lancamento} onClose={onClose} title="Confirmar pagamento">
      <div className={styles.info}>
        <span className={styles.infoDesc}>{lancamento.desc}</span>
        <span className={styles.infoVal}>{fmt(lancamento.valor)}</span>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Pagar com qual conta?</label>
        <div className={styles.contaList}>
          {contasOperacionais.map(c => (
            <button
              key={c.id}
              className={[styles.contaOpt, contaId === String(c.id) ? styles.selected : ''].join(' ')}
              onClick={() => setContaId(String(c.id))}
              style={{ '--accent': c.cor || '#6366f1' }}
            >
              <span className={styles.contaDot} />
              <span className={styles.contaNome}>{c.nome}</span>
              <span className={styles.contaTipo}>{c.tipo}</span>
            </button>
          ))}
          {contasOperacionais.length === 0 && (
            <p className={styles.empty}>Nenhuma conta corrente ou digital cadastrada.</p>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.btnSecondary} onClick={onClose}>Cancelar</button>
        <button
          className={styles.btnPrimary}
          onClick={confirmar}
          disabled={!contaId}
        >
          <i className="ti ti-check" />
          Confirmar pagamento
        </button>
      </div>
    </Modal>
  )
}
